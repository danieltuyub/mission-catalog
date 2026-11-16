-- Admin panel: review of pin requests, user management and read-only moderation of messages.
-- Needs 20261118 (roles, `has_permission`), 20261120 (pin_requests) and 20261121 (conversations).
-- Admins hold every permission, so `pins.approve`, `users.manage` and `messages.moderate` need no rows.

-- ---------------------------------------------------------------------------
-- Pin requests: admins review them (and can undo a failed approval)
-- ---------------------------------------------------------------------------
-- Only the status changes. Requesters have no update policy at all.
revoke update on public.pin_requests from authenticated;
grant update (status) on public.pin_requests to authenticated;

create policy "pin_requests: review" on public.pin_requests
  for update to authenticated
  using ((select public.has_permission('pins.approve')))
  with check ((select public.has_permission('pins.approve')));

-- ---------------------------------------------------------------------------
-- Users: list (with email, which only auth.users knows), roles and names
-- ---------------------------------------------------------------------------
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  roles text[],
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.first_name, ''),
    coalesce(p.last_name, ''),
    coalesce((select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = u.id), '{}'::text[]),
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- A user holds one role. Admins cannot change their own (nobody locks themselves out).
create function public.admin_set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_role not in ('admin', 'creator', 'subscriber') then
    raise exception 'invalid_role';
  end if;
  if target = (select auth.uid()) then
    raise exception 'own_role';
  end if;
  if not exists (select 1 from auth.users where id = target) then
    raise exception 'not_found';
  end if;

  delete from public.user_roles where user_id = target;
  insert into public.user_roles (user_id, role) values (target, new_role);
end;
$$;

revoke all on function public.admin_list_users(), public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_user_role(uuid, text) to authenticated;

-- Admins edit anyone's name (the own-profile policy keeps working for everyone else).
create policy "profiles: update by admin" on public.profiles
  for update to authenticated
  using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));

-- ---------------------------------------------------------------------------
-- Messages: admins can read every conversation (never write or mark as read)
-- ---------------------------------------------------------------------------
create policy "conversations: read all (moderation)" on public.conversations
  for select to authenticated
  using ((select public.has_permission('messages.moderate')));

create policy "messages: read all (moderation)" on public.messages
  for select to authenticated
  using ((select public.has_permission('messages.moderate')));
