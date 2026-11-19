-- Preferred interface language per user. NULL means "none chosen yet": the app then keeps the
-- language already in use on that device and saves it. Each user edits their own (the existing
-- "profiles: update own" policy), and admins any (the "update by admin" policy).
-- Needs 20261118 (profiles) and 20261129 (admin_list_users).

alter table public.profiles
  add column language text check (language in ('es', 'en'));

-- The admin's list gains the column, so the function is replaced.
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
  banned_until timestamptz,
  language text
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
    u.banned_until,
    p.language
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
