-- Public contact form: anyone (signed in or not) writes to the admins, who read it in an inbox.
-- Separate from `messages`: those are between two accounts, these come from people who may have none.
-- Needs 20261118 (has_permission, `messages.moderate`).

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  -- An email or a phone number: how to answer. The app checks the shape; the database only bounds it.
  contact text not null check (char_length(btrim(contact)) between 3 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  -- The sender's language, so the answer can match it.
  language text check (language in ('es', 'en')),
  created_at timestamptz not null default now(),
  -- Null until an admin opens it.
  read_at timestamptz
);

create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index contact_messages_unread_idx on public.contact_messages (created_at desc) where read_at is null;

-- The form is public, so the table needs a brake: the same sender cannot flood it, and neither can
-- anyone in total. Counts are over the last hour.
create function public.contact_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.contact := btrim(new.contact);
  new.body := btrim(new.body);
  -- Clients never choose these.
  new.id := gen_random_uuid();
  new.created_at := now();
  new.read_at := null;

  if (select count(*) from public.contact_messages
      where lower(contact) = lower(new.contact) and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger contact_messages_before_insert
  before insert on public.contact_messages
  for each row execute function public.contact_messages_before_insert();

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant insert (name, contact, body, language) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (read_at) on public.contact_messages to authenticated;

create policy "contact_messages: anyone writes" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

create policy "contact_messages: admins read" on public.contact_messages
  for select to authenticated
  using ((select public.has_permission('messages.moderate')));

-- Only to mark it read or unread.
create policy "contact_messages: admins mark read" on public.contact_messages
  for update to authenticated
  using ((select public.has_permission('messages.moderate')))
  with check ((select public.has_permission('messages.moderate')));

-- Live badge (RLS still decides who receives what).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end;
$$;
