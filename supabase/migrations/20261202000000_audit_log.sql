-- Audit trail: who did what, to what, when, and what changed. Append-only; only admins read it.
-- Separate from operational logs (errors, latency): this is the record people answer "who changed this?" with.
-- Needs 20261118 (has_permission, profiles), 20261123 (admin_set_user_role), 20261125 (pin_contacts),
-- 20261129 (banned_until).
--
-- Recorded: auth.login, auth.logout, user.created / role_changed / profile_updated / blocked / unblocked /
-- deleted, pin_request.created / approved / rejected / reopened, pin.updated / deleted / contact_changed,
-- project.updated / deleted / images_changed. Messages are deliberately not recorded.
--
-- The actor is `auth.uid()`: the person whose request fired the change. A login has no `auth.uid()` yet,
-- so it is the user itself. NULL means the system or the dashboard.

create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- No foreign key: the trail must outlive the account. `actor_email` keeps who it was.
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  -- A readable name of the entity at that moment (a deleted pin has nothing else left to show).
  entity_label text,
  -- Only the fields that changed (all of them for a deletion).
  before jsonb,
  after jsonb
);

create index audit_log_created_idx on public.audit_log (created_at desc, id desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_action_idx on public.audit_log (action, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy "audit_log: admins read" on public.audit_log
  for select to authenticated
  using ((select public.has_permission('users.manage')));

-- Append-only, for everyone: not even the owner edits history by accident.
create function public.audit_log_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log_is_append_only';
end;
$$;

create trigger audit_log_no_change
  before update or delete on public.audit_log
  for each row execute function public.audit_log_append_only();

-- ---------------------------------------------------------------------------
-- The one way in. Not callable from the app: only the triggers and functions below.
-- ---------------------------------------------------------------------------
create function public.audit_write(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_label text,
  p_before jsonb,
  p_after jsonb,
  p_actor uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, before, after)
  values (
    p_actor,
    (select u.email::text from auth.users u where u.id = p_actor),
    p_action, p_entity_type, p_entity_id, p_label, p_before, p_after
  );
end;
$$;

revoke all on function public.audit_write(text, text, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;

-- The email of a user, for labels (null when the account is gone).
create function public.audit_user_email(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text from auth.users u where u.id = p_id;
$$;

revoke all on function public.audit_user_email(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rows that change: projects and pins (updates and deletions)
-- Arguments: entity type, then the column that names the row.
-- ---------------------------------------------------------------------------
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Bookkeeping and the published (randomised) pin place: noise, not changes.
  ignored text[] := array['updated_at', 'created_at', 'lat', 'lng'];
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) end;
  before_j jsonb := '{}'::jsonb;
  after_j jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(new_j) loop
      if not (k = any (ignored)) and (new_j -> k) is distinct from (old_j -> k) then
        before_j := before_j || jsonb_build_object(k, old_j -> k);
        after_j := after_j || jsonb_build_object(k, new_j -> k);
      end if;
    end loop;
    if after_j = '{}'::jsonb then
      return null;
    end if;
  else
    before_j := old_j - ignored;
  end if;

  perform public.audit_write(
    tg_argv[0] || case tg_op when 'UPDATE' then '.updated' else '.deleted' end,
    tg_argv[0],
    coalesce(new_j, old_j) ->> 'id',
    coalesce(new_j, old_j) ->> tg_argv[1],
    before_j,
    case when tg_op = 'UPDATE' then after_j end
  );
  return null;
end;
$$;

create trigger projects_audit
  after update or delete on public.projects
  for each row execute function public.audit_row_change('project', 'name');

create trigger pins_audit
  after update or delete on public.pins
  for each row execute function public.audit_row_change('pin', 'title');

-- A project's photos: added or removed after the project exists (its creation uploads them too, so
-- the first minute is skipped), and never when the whole project is going away.
create function public.audit_project_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  img record := case when tg_op = 'INSERT' then new else old end;
begin
  select id, name, created_at into p from public.projects where id = img.project_id;
  if not found or p.created_at > now() - interval '1 minute' then
    return null;
  end if;
  perform public.audit_write(
    'project.images_changed', 'project', p.id::text, p.name,
    case when tg_op = 'DELETE' then jsonb_build_object('removed', img.path) end,
    case when tg_op = 'INSERT' then jsonb_build_object('added', img.path) end
  );
  return null;
end;
$$;

create trigger project_images_audit
  after insert or delete on public.project_images
  for each row execute function public.audit_project_image();

-- ---------------------------------------------------------------------------
-- Pin requests: created, and reviewed
-- ---------------------------------------------------------------------------
create function public.audit_pin_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write(
      'pin_request.created', 'pin_request', new.id::text, new.title, null,
      jsonb_build_object('requested_by', new.requested_by)
    );
  else
    perform public.audit_write(
      'pin_request.' || case new.status when 'pending' then 'reopened' else new.status end,
      'pin_request', new.id::text, new.title,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'requested_by', new.requested_by)
    );
  end if;
  return null;
end;
$$;

create trigger pin_requests_audit_insert
  after insert on public.pin_requests
  for each row execute function public.audit_pin_request();

create trigger pin_requests_audit_review
  after update of status on public.pin_requests
  for each row when (old.status is distinct from new.status)
  execute function public.audit_pin_request();

-- ---------------------------------------------------------------------------
-- Who answers for a pin. Not when the pin itself is being deleted (its contact goes with it).
-- ---------------------------------------------------------------------------
create function public.audit_pin_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ record := case when tg_op = 'DELETE' then old else new end;
  title_ text;
begin
  select title into title_ from public.pins where id = row_.pin_id;
  if not found then
    return null;
  end if;
  perform public.audit_write(
    'pin.contact_changed', 'pin', row_.pin_id::text, title_,
    case when tg_op <> 'INSERT' then jsonb_build_object('contact', public.audit_user_email(old.user_id)) end,
    case when tg_op <> 'DELETE' then jsonb_build_object('contact', public.audit_user_email(new.user_id)) end
  );
  return null;
end;
$$;

create trigger pin_contacts_audit
  after insert or update of user_id or delete on public.pin_contacts
  for each row execute function public.audit_pin_contact();

-- ---------------------------------------------------------------------------
-- Users: profile edits (their own or an admin's), blocks, logins, deletion
-- ---------------------------------------------------------------------------
create function public.audit_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_j jsonb := '{}'::jsonb;
  after_j jsonb := '{}'::jsonb;
begin
  if new.first_name is distinct from old.first_name then
    before_j := before_j || jsonb_build_object('first_name', old.first_name);
    after_j := after_j || jsonb_build_object('first_name', new.first_name);
  end if;
  if new.last_name is distinct from old.last_name then
    before_j := before_j || jsonb_build_object('last_name', old.last_name);
    after_j := after_j || jsonb_build_object('last_name', new.last_name);
  end if;
  if new.language is distinct from old.language then
    before_j := before_j || jsonb_build_object('language', old.language);
    after_j := after_j || jsonb_build_object('language', new.language);
  end if;
  if after_j = '{}'::jsonb then
    return null;
  end if;
  perform public.audit_write('user.profile_updated', 'user', new.user_id::text, public.audit_user_email(new.user_id), before_j, after_j);
  return null;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.audit_profile();

create function public.audit_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.audit_write('user.deleted', 'user', old.id::text, old.email::text, jsonb_build_object('email', old.email), null);
    return null;
  end if;

  -- A login: the user is not "signed in" for `auth.uid()` yet, so the actor is the account itself.
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    perform public.audit_write('auth.login', 'user', new.id::text, new.email::text, null, null, new.id);
  end if;

  if new.banned_until is distinct from old.banned_until then
    perform public.audit_write(
      case when new.banned_until is null then 'user.unblocked' else 'user.blocked' end,
      'user', new.id::text, new.email::text,
      jsonb_build_object('banned_until', old.banned_until),
      jsonb_build_object('banned_until', new.banned_until)
    );
  end if;
  return null;
end;
$$;

create trigger auth_users_audit
  after update of last_sign_in_at, banned_until or delete on auth.users
  for each row execute function public.audit_auth_user();

-- ---------------------------------------------------------------------------
-- What triggers cannot see
-- ---------------------------------------------------------------------------
-- Role changes: replaced to also record who changed which role to which.
create or replace function public.admin_set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role text;
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

  select role into old_role from public.user_roles where user_id = target limit 1;
  delete from public.user_roles where user_id = target;
  insert into public.user_roles (user_id, role) values (target, new_role);

  if old_role is distinct from new_role then
    perform public.audit_write(
      'user.role_changed', 'user', target::text, public.audit_user_email(target),
      jsonb_build_object('role', old_role), jsonb_build_object('role', new_role)
    );
  end if;
end;
$$;

-- An admin created an account (called by the `admin-create-user` function with the admin's own session).
create function public.audit_user_created(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.audit_write(
    'user.created', 'user', target::text, public.audit_user_email(target), null, jsonb_build_object('role', new_role)
  );
end;
$$;

-- Signing out, from the button (an expired session leaves no trace: the database never hears of it).
create function public.audit_logout()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    return;
  end if;
  perform public.audit_write('auth.logout', 'user', me::text, public.audit_user_email(me), null, null);
end;
$$;

revoke all on function public.audit_user_created(uuid, text), public.audit_logout() from public, anon;
grant execute on function public.audit_user_created(uuid, text), public.audit_logout() to authenticated;
