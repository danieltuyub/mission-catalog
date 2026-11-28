-- Audit of the new tables. Profile history (entity types `profile`, `profile_pin`, `profile_pin_request`)
-- is read with `profiles.audit_read`; everything else keeps `users.manage`.
-- Needs 20261202 (audit_log) and 20261205 (profile pins).

drop policy "audit_log: admins read" on public.audit_log;
create policy "audit_log: read" on public.audit_log
  for select to authenticated
  using (
    case
      when entity_type in ('profile', 'profile_pin', 'profile_pin_request')
        then (select public.has_permission('profiles.audit_read'))
      else (select public.has_permission('users.manage'))
    end
  );

-- ---------------------------------------------------------------------------
-- Pins: profile ones are profile history
-- ---------------------------------------------------------------------------
drop trigger pins_audit on public.pins;
create trigger pins_audit
  after update or delete on public.pins
  for each row when (old.profile_user_id is null)
  execute function public.audit_row_change('pin', 'title');
create trigger profile_pins_audit
  after update or delete on public.pins
  for each row when (old.profile_user_id is not null)
  execute function public.audit_row_change('profile_pin', 'title');

-- The contact of a profile pin is always its owner: nothing to record.
create or replace function public.audit_pin_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ record := case when tg_op = 'DELETE' then old else new end;
  title_ text;
begin
  select title into title_ from public.pins where id = row_.pin_id and profile_user_id is null;
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

create or replace function public.audit_pin_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entity text := case when new.profile_user_id is null then 'pin_request' else 'profile_pin_request' end;
begin
  if tg_op = 'INSERT' then
    perform public.audit_write(
      entity || '.created', entity, new.id::text, new.title, null,
      jsonb_build_object('requested_by', new.requested_by)
    );
  elsif old.status is distinct from new.status then
    perform public.audit_write(
      entity || '.' || case new.status when 'pending' then 'reopened' else new.status end,
      entity, new.id::text, new.title,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'requested_by', new.requested_by)
    );
  else
    -- A waiting profile request replaced by a newer one.
    perform public.audit_write(
      entity || '.updated', entity, new.id::text, new.title, null,
      jsonb_build_object('requested_by', new.requested_by)
    );
  end if;
  return null;
end;
$$;

create trigger pin_requests_audit_replace
  after update on public.pin_requests
  for each row when (new.profile_user_id is not null and old.status = new.status and old.created_at is distinct from new.created_at)
  execute function public.audit_pin_request();

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------
create function public.audit_profile_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tracked text[] := array['household', 'testimony', 'home_country', 'home_description', 'show_on_map'];
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
  before_j jsonb := '{}'::jsonb;
  after_j jsonb := '{}'::jsonb;
  k text;
begin
  foreach k in array tracked loop
    if (new_j -> k) is distinct from (old_j -> k) then
      before_j := before_j || jsonb_build_object(k, old_j -> k);
      after_j := after_j || jsonb_build_object(k, new_j -> k);
    end if;
  end loop;
  if after_j <> '{}'::jsonb then
    perform public.audit_write(
      'profile.updated', 'profile', new.user_id::text, public.audit_user_email(new.user_id), before_j, after_j
    );
  end if;
  return null;
end;
$$;

create trigger profile_details_audit
  after update on public.profile_details
  for each row execute function public.audit_profile_details();

-- Arguments: action, catalog table, column of this row that points to it, catalog column with the name.
create function public.audit_profile_choice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  uid uuid := (row_ ->> 'user_id')::uuid;
  name_ text;
begin
  -- Not when the whole account is going away.
  if not exists (select 1 from auth.users where id = uid) then
    return null;
  end if;
  execute format('select %I from public.%I where id = $1', tg_argv[3], tg_argv[1])
    into name_ using (row_ ->> tg_argv[2])::uuid;
  perform public.audit_write(
    tg_argv[0], 'profile', uid::text, public.audit_user_email(uid),
    case when tg_op = 'DELETE' then jsonb_build_object('removed', name_) end,
    case when tg_op = 'INSERT' then jsonb_build_object('added', name_) end
  );
  return null;
end;
$$;

create trigger user_skills_audit
  after insert or delete on public.user_skills
  for each row execute function public.audit_profile_choice('profile.skills_changed', 'skills', 'skill_id', 'name_es');
create trigger user_trainings_audit
  after insert or delete on public.user_trainings
  for each row execute function public.audit_profile_choice('profile.trainings_changed', 'trainings', 'training_id', 'name');

create function public.audit_profile_backer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ignored text[] := array['id', 'user_id', 'created_at'];
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  uid uuid := (coalesce(new_j, old_j) ->> 'user_id')::uuid;
begin
  if not exists (select 1 from auth.users where id = uid) or (old_j - ignored) is not distinct from (new_j - ignored) then
    return null;
  end if;
  perform public.audit_write(
    'profile.backer_' || case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'updated' else 'removed' end,
    'profile', uid::text, public.audit_user_email(uid), old_j - ignored, new_j - ignored
  );
  return null;
end;
$$;

create trigger profile_backers_audit
  after insert or update or delete on public.profile_backers
  for each row execute function public.audit_profile_backer();

create function public.audit_profile_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = new.user_id) then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.audit_write(
      'profile.verified', 'profile', new.user_id::text, public.audit_user_email(new.user_id),
      null, jsonb_build_object('subject', new.subject)
    );
  elsif old.invalidated_at is null and new.invalidated_at is not null then
    perform public.audit_write(
      'profile.verification_removed', 'profile', new.user_id::text, public.audit_user_email(new.user_id),
      jsonb_build_object('subject', new.subject), null
    );
  end if;
  return null;
end;
$$;

create trigger profile_verifications_audit
  after insert or update on public.profile_verifications
  for each row execute function public.audit_profile_verification();

-- ---------------------------------------------------------------------------
-- Catalogs and roles: created, changed, deleted. Arguments: entity type, column with the name.
-- ---------------------------------------------------------------------------
create function public.audit_table_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ignored text[] := array['id', 'created_at'];
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  before_j jsonb := old_j - ignored;
  after_j jsonb := new_j - ignored;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(new_j - ignored) loop
      if (new_j -> k) is not distinct from (old_j -> k) then
        before_j := before_j - k;
        after_j := after_j - k;
      end if;
    end loop;
    if after_j = '{}'::jsonb then
      return null;
    end if;
  end if;
  perform public.audit_write(
    tg_argv[0] || case tg_op when 'INSERT' then '.created' when 'UPDATE' then '.updated' else '.deleted' end,
    tg_argv[0],
    coalesce(new_j, old_j) ->> 'id',
    coalesce(new_j, old_j) ->> tg_argv[1],
    before_j,
    after_j
  );
  return null;
end;
$$;

create trigger skills_audit
  after insert or update or delete on public.skills
  for each row execute function public.audit_table_change('skill', 'name_es');
create trigger trainings_audit
  after insert or update or delete on public.trainings
  for each row execute function public.audit_table_change('training', 'name');
create trigger roles_audit
  after insert or update or delete on public.roles
  for each row execute function public.audit_table_change('role', 'name_es');

create function public.audit_role_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ record := case when tg_op = 'DELETE' then old else new end;
  name_ text;
begin
  -- Not when the whole role is going away.
  select name_es into name_ from public.roles where id = row_.role;
  if not found then
    return null;
  end if;
  perform public.audit_write(
    'role.permission_' || case tg_op when 'DELETE' then 'removed' else 'added' end,
    'role', row_.role, name_,
    case when tg_op = 'DELETE' then jsonb_build_object('permission', row_.permission) end,
    case when tg_op = 'INSERT' then jsonb_build_object('permission', row_.permission) end
  );
  return null;
end;
$$;

create trigger role_permissions_audit
  after insert or delete on public.role_permissions
  for each row execute function public.audit_role_permission();

create function public.audit_role_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.audit_write(
    'role_request.' || case when tg_op = 'INSERT' then 'created' else new.status end,
    'role_request', new.id::text, public.audit_user_email(new.user_id),
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status) end,
    case
      when tg_op = 'INSERT' then jsonb_build_object('role', new.role, 'message', new.message)
      else jsonb_build_object('status', new.status, 'role', new.role)
    end
  );
  return null;
end;
$$;

create trigger role_requests_audit_insert
  after insert on public.role_requests
  for each row execute function public.audit_role_request();
create trigger role_requests_audit_review
  after update of status on public.role_requests
  for each row when (old.status is distinct from new.status)
  execute function public.audit_role_request();
