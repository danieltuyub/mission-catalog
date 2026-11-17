-- Messages from a pin: they go to the pin's contact (`pin_contacts`, private) and open one thread
-- per pair and pin, next to the project and direct ones.
-- Needs 20261121 (conversations) and 20261125 (pin_contacts).

alter table public.conversations
  add column pin_id uuid references public.pins (id) on delete set null;
alter table public.messages
  add column pin_id uuid references public.pins (id) on delete set null;

-- One thread per pair and pin. Deleting a pin turns its threads into direct ones, which must never
-- fail, so only live pins are indexed (same reasoning as projects).
create unique index conversations_pair_pin_idx
  on public.conversations (user_a, user_b, pin_id) where pin_id is not null;

-- ---------------------------------------------------------------------------
-- Who answers for a pin. The table is private: these two functions are the only way to ask.
-- ---------------------------------------------------------------------------
create function public.is_pin_contact(p_pin uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pin_contacts where pin_id = p_pin and user_id = uid);
$$;

-- 'none' (no contact yet), 'self' (the caller is the contact) or 'other' (someone else is).
-- Never says who, so signed-out visitors can ask too.
create function public.pin_contact_state(p_pin uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when user_id = (select auth.uid()) then 'self' else 'other' end
     from public.pin_contacts where pin_id = p_pin),
    'none'
  );
$$;

revoke all on function public.is_pin_contact(uuid, uuid), public.pin_contact_state(uuid) from public;
grant execute on function public.pin_contact_state(uuid) to anon, authenticated;
-- Used by the insert policy below, which runs as the signed-in user.
grant execute on function public.is_pin_contact(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The server picks the recipient and finds or opens the thread (now also by pin)
-- ---------------------------------------------------------------------------
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
  if new.recipient_id is null and new.pin_id is not null then
    -- Written from a pin: it goes to its contact (null when there is none, so the insert fails).
    select user_id into new.recipient_id from public.pin_contacts where pin_id = new.pin_id;
  elsif new.recipient_id is null and new.project_id is not null then
    -- Written from a project page: it goes to whoever created that project.
    select created_by into new.recipient_id from public.projects where id = new.project_id;
  end if;
  select btrim(first_name || ' ' || last_name) into new.sender_name
  from public.profiles where user_id = new.sender_id;
  new.sender_name := coalesce(new.sender_name, '');

  if new.sender_id is not null and new.recipient_id is not null and new.sender_id <> new.recipient_id then
    a := least(new.sender_id, new.recipient_id);
    b := greatest(new.sender_id, new.recipient_id);
    -- Two simultaneous first messages of a pair must not open two conversations.
    perform pg_advisory_xact_lock(
      hashtextextended(a::text || b::text || coalesce(new.project_id::text, '') || coalesce(new.pin_id::text, ''), 0)
    );

    select id into conv
    from public.conversations
    where user_a = a and user_b = b
      and project_id is not distinct from new.project_id
      and pin_id is not distinct from new.pin_id
    order by created_at
    limit 1;

    if conv is null then
      insert into public.conversations (user_a, user_b, project_id, pin_id)
      values (a, b, new.project_id, new.pin_id)
      returning id into conv;
    else
      update public.conversations set last_message_at = now() where id = conv;
    end if;
    new.conversation_id := conv;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may send. Project and direct messages keep the rule (one side is a creator or admin).
-- From a pin, anyone allowed to send can write to its contact, and the contact can answer.
-- ---------------------------------------------------------------------------
drop policy "messages: send" on public.messages;

create policy "messages: send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.has_permission('messages.send'))
    and (
      (pin_id is null and (public.is_creator(recipient_id) or public.is_creator(sender_id)))
      or (
        pin_id is not null
        and project_id is null
        and (public.is_pin_contact(pin_id, recipient_id) or public.is_pin_contact(pin_id, sender_id))
      )
    )
  );
