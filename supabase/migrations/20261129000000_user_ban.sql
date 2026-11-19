-- Block accounts from the admin panel, for a time or indefinitely. Uses auth's own `banned_until`:
-- GoTrue refuses sign-in and token refresh while it is in the future. NULL means "not blocked";
-- "indefinitely" is stored as a date far in the future (see INDEFINITE in the app).
-- Needs 20261118 (has_permission) and 20261123 (admin_list_users).

create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      -- A blocked account loses its permissions at once, not when its access token expires.
      and not exists (
        select 1 from auth.users u where u.id = ur.user_id and u.banned_until > now()
      )
      and (
        ur.role = 'admin'
        or exists (
          select 1 from public.role_permissions rp
          where rp.role = ur.role and rp.permission = p
        )
      )
  );
$$;

-- The list gains a column, so the function is replaced.
drop function public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  roles text[],
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz
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
    u.last_sign_in_at,
    u.banned_until
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- `until_ts` null lifts the block. Nobody blocks themselves.
create function public.admin_set_user_ban(target uuid, until_ts timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'own_ban';
  end if;
  if until_ts is not null and until_ts <= now() then
    raise exception 'invalid_until';
  end if;
  if not exists (select 1 from auth.users where id = target) then
    raise exception 'not_found';
  end if;

  update auth.users set banned_until = until_ts where id = target;
  -- End its sessions so it cannot keep refreshing tokens.
  if until_ts is not null then
    delete from auth.sessions where user_id = target;
  end if;
end;
$$;

revoke all on function public.admin_list_users(), public.admin_set_user_ban(uuid, timestamptz) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_user_ban(uuid, timestamptz) to authenticated;
