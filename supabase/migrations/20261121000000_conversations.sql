-- Conversations: a stable id for "these two people, about this project", on top of `messages`.
-- The inbox lists conversations (last activity, preview, unread) instead of rebuilding threads
-- from loose messages. Messages keep everything they had; the client still sends only project + text.
-- Needs 20261118 (messages).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- The two people, always stored in this order (user_a < user_b) so a pair has one representation.
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  -- Null for a direct conversation, or when the project was deleted.
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Orders the inbox: the latest activity, not the date of any single message.
  last_message_at timestamptz not null default now(),
  check (user_a < user_b)
);

-- One thread per pair and project. Direct ones (no project) are not unique-indexed: deleting a
-- project turns its threads into direct ones, and that must never fail; the trigger reuses the oldest.
create unique index conversations_pair_project_idx
  on public.conversations (user_a, user_b, project_id) where project_id is not null;
create index conversations_pair_idx on public.conversations (user_a, user_b);
create index conversations_user_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_user_b_idx on public.conversations (user_b, last_message_at desc);

alter table public.messages
  add column conversation_id uuid references public.conversations (id) on delete cascade;

-- Existing messages: one conversation per pair and project, then link them.
insert into public.conversations (user_a, user_b, project_id, created_at, last_message_at)
select least(sender_id, recipient_id), greatest(sender_id, recipient_id), project_id,
       min(created_at), max(created_at)
from public.messages
group by 1, 2, 3;

update public.messages m
set conversation_id = c.id
from public.conversations c
where c.user_a = least(m.sender_id, m.recipient_id)
  and c.user_b = greatest(m.sender_id, m.recipient_id)
  and c.project_id is not distinct from m.project_id;

-- Every message belongs to one (a message without recipient or to oneself fails its own checks anyway).
alter table public.messages alter column conversation_id set not null;

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
-- "Unread in this conversation" for the inbox badge.
create index messages_unread_idx on public.messages (recipient_id, conversation_id) where read_at is null;

-- The server still decides who sends and receives; now it also finds or opens the conversation.
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
  conv uuid;
begin
  new.sender_id := auth.uid();
  -- Written from a project page: it goes to whoever created that project.
  if new.recipient_id is null and new.project_id is not null then
    select created_by into new.recipient_id from public.projects where id = new.project_id;
  end if;
  select btrim(first_name || ' ' || last_name) into new.sender_name
  from public.profiles where user_id = new.sender_id;
  new.sender_name := coalesce(new.sender_name, '');

  if new.sender_id is not null and new.recipient_id is not null and new.sender_id <> new.recipient_id then
    a := least(new.sender_id, new.recipient_id);
    b := greatest(new.sender_id, new.recipient_id);
    -- Two simultaneous first messages of a pair must not open two conversations.
    perform pg_advisory_xact_lock(hashtextextended(a::text || b::text || coalesce(new.project_id::text, ''), 0));

    select id into conv
    from public.conversations
    where user_a = a and user_b = b and project_id is not distinct from new.project_id
    order by created_at
    limit 1;

    if conv is null then
      insert into public.conversations (user_a, user_b, project_id)
      values (a, b, new.project_id)
      returning id into conv;
    else
      update public.conversations set last_message_at = now() where id = conv;
    end if;
    new.conversation_id := conv;
  end if;
  return new;
end;
$$;

-- Only the two people see their conversation. Rows are written by the trigger above, never by clients.
alter table public.conversations enable row level security;
revoke all on public.conversations from anon;
revoke insert, update, delete on public.conversations from authenticated;

create policy "conversations: read mine" on public.conversations
  for select to authenticated
  using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

-- Live inbox updates (RLS still decides who receives what).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversations;
  end if;
end;
$$;
