-- Access rules of roles, profiles and profile pins, by kind of caller. Everything happens inside one
-- transaction that is rolled back: nothing stays. Run it against `development` only, with the
-- migrations applied (see README, "Database tests"). Any failure aborts with its label.
begin;

-- Coordinates travel as text between steps: keep every digit (some sessions default to 0).
set local extra_float_digits = 1;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
select set_config('test.root', current_user, true);

-- Test accounts: 1 owner, 2 other, 3 validator, 4 admin, 5 account manager (users.manage),
-- 6 historian (profiles.audit_read), 7 pin reviewer (pins.approve), 8 profile editor.
create function pg_temp.u(n int) returns uuid language sql immutable
as $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- The next statements run as that user (null: signed out).
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end,
    true
  );
  perform set_config('role', case when uid is null then 'anon' else 'authenticated' end, true);
end $$;

create function pg_temp.root() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', current_setting('test.root'), true);
end $$;

create function pg_temp.ok(passed boolean, label text) returns void language plpgsql as $$
begin
  if passed is not true then
    raise exception 'FAILED: %', label;
  end if;
end $$;

create function pg_temp.fails(statement text, expected text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) > 0 then
      return;
    end if;
    raise exception 'FAILED: expected "%", got "%" for: %', expected, sqlerrm, statement;
  end;
  raise exception 'FAILED: expected "%" but it succeeded: %', expected, statement;
end $$;

-- Rows a statement touched (row level security makes forbidden updates touch none).
create function pg_temp.touched(statement text) returns int language plpgsql as $$
declare
  n int;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end $$;

create function pg_temp.skill(skill_name text) returns uuid language sql stable
as $$ select id from public.skills where name_en = skill_name $$;

create function pg_temp.held(uid uuid) returns text language sql stable
as $$ select string_agg(role, ',' order by role) from public.user_roles where user_id = uid $$;

-- Values captured by one step for a later one.
create function pg_temp.keep(k text, v text) returns text language sql
as $$ select set_config('test.' || k, v, true) $$;
create function pg_temp.kept(k text) returns text language sql stable
as $$ select current_setting('test.' || k) $$;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', pg_temp.u(n), 'authenticated', 'authenticated',
       'qa-access-' || n || '@example.invalid',
       case when n = 2 then '{}'::jsonb else jsonb_build_object('first_name', case n when 1 then 'Ana' else 'QA' || n end) end
from generate_series(1, 8) as n;

select pg_temp.ok(
  (select count(*) from public.user_roles where user_id::text like '00000000-0000-4000-8000-%' and role = 'subscriber') = 8
  and (select count(*) from public.profile_details where user_id::text like '00000000-0000-4000-8000-%') = 8,
  'new accounts get the subscriber role and an empty profile'
);

insert into public.user_roles (user_id, role) values (pg_temp.u(4), 'admin'), (pg_temp.u(3), 'validator');

-- ---------------------------------------------------------------------------
-- Role management
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(4));
select pg_temp.ok(public.admin_save_role(null, 'QA cuentas', 'QA accounts', false, array['users.manage']) = 'qa_accounts', 'admin creates a role');
select public.admin_save_role(null, 'QA historial', 'QA history', false, array['profiles.audit_read']);
select public.admin_save_role(null, 'QA pins', 'QA pins', false, array['pins.approve']);
select public.admin_save_role(null, 'QA editor', 'QA editor', false, array['profiles.edit_any']);
select public.admin_set_user_role(pg_temp.u(5), array['qa_accounts']);
select public.admin_set_user_role(pg_temp.u(6), array['qa_history']);
select public.admin_set_user_role(pg_temp.u(7), array['qa_pins']);
select public.admin_set_user_role(pg_temp.u(8), array['qa_editor']);
select pg_temp.root();
select pg_temp.ok(pg_temp.held(pg_temp.u(5)) = 'qa_accounts,subscriber', 'setting roles keeps subscriber');

select pg_temp.act_as(pg_temp.u(4));
select public.admin_set_user_role(pg_temp.u(2), 'creator'::text);
select pg_temp.ok(public.is_creator(pg_temp.u(2)), 'the single-role signature still works');
select public.admin_set_user_role(pg_temp.u(2), '{}'::text[]);
select pg_temp.ok(not public.is_creator(pg_temp.u(2)), 'a removed role takes its permissions');
select pg_temp.fails($q$ select public.admin_set_user_role(pg_temp.u(4), array['creator']) $q$, 'own_role');
select pg_temp.fails($q$ select public.admin_set_user_role(pg_temp.u(2), array['nope']) $q$, 'invalid_role');
select pg_temp.fails($q$ select public.admin_save_role('admin', 'a', 'a', false, '{}') $q$, 'admin_role_locked');
select pg_temp.fails($q$ select public.admin_save_role(null, 'x', 'x', false, array['nope.nope']) $q$, 'invalid_permission');
select pg_temp.fails($q$ select public.admin_delete_role('creator') $q$, 'system_role');
select pg_temp.fails($q$ select public.admin_delete_role('qa_accounts') $q$, 'role_in_use');
select public.admin_save_role(null, 'QA temporal', 'QA temporary', false, array['projects.save']);
select public.admin_delete_role('qa_temporary');
select pg_temp.ok(not exists (select 1 from public.roles where id = 'qa_temporary'), 'an unused role can be deleted');
select pg_temp.fails($q$ delete from public.user_roles where user_id = pg_temp.u(2) $q$, 'permission denied');

select pg_temp.act_as(pg_temp.u(5));
select pg_temp.fails($q$ select public.admin_set_user_role(pg_temp.u(2), array['creator']) $q$, 'forbidden');
select pg_temp.fails($q$ select public.admin_set_user_role(pg_temp.u(2), 'creator'::text) $q$, 'forbidden');
select pg_temp.fails($q$ select public.admin_save_role(null, 'x', 'x', false, '{}') $q$, 'forbidden');
select pg_temp.ok((select count(*) from public.role_permissions) = 0, 'only admins read role permissions');

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------
select pg_temp.act_as(null);
select pg_temp.fails($q$ select * from public.profile_details $q$, 'permission denied');
select pg_temp.fails($q$ select * from public.profile_backers $q$, 'permission denied');
select pg_temp.fails($q$ select * from public.skills $q$, 'permission denied');
select pg_temp.fails($q$ select * from public.roles $q$, 'permission denied');
select pg_temp.fails($q$ select * from public.permissions $q$, 'permission denied');
select pg_temp.fails($q$ select * from public.role_requests $q$, 'permission denied');
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(1), 'testimony', true, null) $q$, 'permission denied');
select id, title, description, lat, lng, kind from public.pins limit 1;

-- ---------------------------------------------------------------------------
-- Owner
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set testimony = '  Mi testimonio  ', household = 'family', home_country = 'México' where user_id = pg_temp.u(1) $q$) = 1, 'owner edits own profile');
select pg_temp.ok((select testimony = 'Mi testimonio' and testimony_updated_at is not null from public.profile_details where user_id = pg_temp.u(1)), 'testimony is trimmed and dated');
select pg_temp.fails($q$ update public.profile_details set testimony_updated_at = now() $q$, 'permission denied');
insert into public.profile_backers (kind, name, phone) select 'person', 'Respaldo ' || n, '555' from generate_series(1, 5) as n;
select pg_temp.fails($q$ insert into public.profile_backers (kind, name, phone) values ('person', 'Sexto', '555') $q$, 'too_many_backers');
delete from public.profile_backers where name = 'Respaldo 5';
select pg_temp.fails($q$ insert into public.profile_backers (kind, name) values ('person', 'Sin contacto') $q$, 'check constraint');
insert into public.profile_backers (kind, name, email) values ('church', 'Iglesia', 'a@example.invalid');
select public.set_user_skills(pg_temp.u(1), 'spiritual', array[pg_temp.skill('Teaching'), pg_temp.skill('Preaching')]);
select public.set_user_skills(pg_temp.u(1), 'manual', array[pg_temp.skill('Electrician')]);
select public.set_user_trainings(pg_temp.u(1), array(select id from public.trainings where name = 'CFTN'));
select pg_temp.ok((select count(*) from public.user_skills where user_id = pg_temp.u(1)) = 3 and (select count(*) from public.user_trainings) = 1, 'owner saves skills and trainings');
select pg_temp.fails($q$ select public.set_user_skills(pg_temp.u(1), 'manual', array[pg_temp.skill('Teaching')]) $q$, 'invalid_skill');
select pg_temp.fails($q$ insert into public.user_skills values (pg_temp.u(1), pg_temp.skill('Plumbing')) $q$, 'permission denied');
select pg_temp.fails($q$ select public.set_user_skills(pg_temp.u(2), 'manual', '{}') $q$, 'forbidden');
select pg_temp.fails($q$ insert into public.skills (category, name_es, name_en) values ('manual', 'x', 'x') $q$, 'row-level security');
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(1), 'testimony', true, null) $q$, 'forbidden');

-- ---------------------------------------------------------------------------
-- Another user
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.ok(
  not exists (select 1 from public.profile_details where user_id = pg_temp.u(1))
  and not exists (select 1 from public.profile_backers where user_id = pg_temp.u(1))
  and not exists (select 1 from public.user_skills where user_id = pg_temp.u(1))
  and not exists (select 1 from public.profiles where user_id = pg_temp.u(1)),
  'others see nothing of a profile'
);
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set testimony = 'x' where user_id = pg_temp.u(1) $q$) = 0, 'others edit nothing');
select pg_temp.fails($q$ insert into public.profile_backers (user_id, kind, name, phone) values (pg_temp.u(5), 'person', 'x', '1') $q$, 'row-level security');
select pg_temp.fails($q$ select public.set_user_trainings(pg_temp.u(1), '{}') $q$, 'forbidden');
select pg_temp.fails($q$ select public.profile_pin_state(pg_temp.u(1)) $q$, 'forbidden');

-- ---------------------------------------------------------------------------
-- Profile editor: everyone's but admins'
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(8));
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set home_description = 'editado' where user_id = pg_temp.u(1) $q$) = 1, 'editor edits a profile');
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set home_description = 'editado' where user_id = pg_temp.u(4) $q$) = 0, 'editor cannot edit an admin');
select pg_temp.ok(exists (select 1 from public.profile_details where user_id = pg_temp.u(4)), 'editor reads an admin profile');

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(3));
select pg_temp.ok(
  (select count(*) from public.profile_backers where user_id = pg_temp.u(1)) = 5
  and exists (select 1 from public.profiles where user_id = pg_temp.u(1)),
  'validator reads the whole profile'
);
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set testimony = 'x' where user_id = pg_temp.u(1) $q$) = 0, 'validator cannot edit');
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(1), 'testimony', true, null) $q$, 'content_changed');
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(2), 'testimony', true, null) $q$, 'empty_content');
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(3), 'testimony', true, null) $q$, 'own_profile');
select public.verify_profile(pg_temp.u(1), s.subject, true, s.seen)
from public.profile_details d
cross join lateral (values ('testimony', d.testimony_updated_at), ('spiritual_skills', d.spiritual_skills_updated_at)) as s (subject, seen)
where d.user_id = pg_temp.u(1);

select pg_temp.act_as(pg_temp.u(1));
select pg_temp.ok((select count(*) from public.profile_verifications where invalidated_at is null) = 2, 'owner sees both verifications');
select pg_temp.fails($q$ update public.profile_verifications set invalidated_at = null $q$, 'permission denied');
update public.profile_details set testimony = 'Testimonio nuevo' where user_id = pg_temp.u(1);
select pg_temp.ok((select string_agg(subject, ',') from public.profile_verifications where invalidated_at is null) = 'spiritual_skills', 'editing the testimony invalidates only it');
select public.set_user_skills(pg_temp.u(1), 'manual', '{}');
select pg_temp.ok((select count(*) from public.profile_verifications where invalidated_at is null) = 1, 'manual skills do not invalidate');
select pg_temp.keep('spiritual_seen', (select spiritual_skills_updated_at::text from public.profile_details where user_id = pg_temp.u(1)));
select public.set_user_skills(pg_temp.u(1), 'spiritual', array[pg_temp.skill('Preaching')]);
select pg_temp.ok(not exists (select 1 from public.profile_verifications where invalidated_at is null), 'spiritual skills invalidate');
select pg_temp.act_as(pg_temp.u(3));
select pg_temp.fails($q$ select public.verify_profile(pg_temp.u(1), 'spiritual_skills', true, pg_temp.kept('spiritual_seen')::timestamptz) $q$, 'content_changed');

-- ---------------------------------------------------------------------------
-- Catalogs
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(4));
update public.skills set active = false where name_en = 'Preaching';
select pg_temp.fails($q$ delete from public.skills where name_en = 'Preaching' $q$, 'foreign key');
select pg_temp.fails($q$ update public.skills set category = 'manual' where name_en = 'Teaching' $q$, 'category_is_fixed');
select pg_temp.act_as(pg_temp.u(1));
select public.set_user_skills(pg_temp.u(1), 'spiritual', array[pg_temp.skill('Preaching'), pg_temp.skill('Teaching')]);
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.fails($q$ select public.set_user_skills(pg_temp.u(2), 'spiritual', array[pg_temp.skill('Preaching')]) $q$, 'invalid_skill');

-- ---------------------------------------------------------------------------
-- Role requests
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(1));
insert into public.role_requests (role, message) values ('creator', 'Quiero publicar');
select pg_temp.fails($q$ insert into public.role_requests (role, message) values ('creator', 'otra') $q$, 'duplicate key');
select pg_temp.fails($q$ insert into public.role_requests (role, message) values ('admin', 'x') $q$, 'row-level security');
select pg_temp.fails($q$ insert into public.role_requests (role, message) values ('validator', 'x') $q$, 'row-level security');
select pg_temp.fails($q$ insert into public.role_requests (role, message, status) values ('creator', 'x', 'approved') $q$, 'permission denied');
select pg_temp.keep('role_request', (select id::text from public.role_requests where user_id = pg_temp.u(1)));
select pg_temp.act_as(pg_temp.u(5));
select pg_temp.ok(not exists (select 1 from public.role_requests), 'account manager sees no role requests');
select pg_temp.fails($q$ select public.review_role_request(pg_temp.kept('role_request')::uuid, true) $q$, 'forbidden');
select pg_temp.act_as(pg_temp.u(4));
select public.review_role_request(pg_temp.kept('role_request')::uuid, true);
select pg_temp.fails($q$ select public.review_role_request(pg_temp.kept('role_request')::uuid, false) $q$, 'already_reviewed');
select pg_temp.ok(public.is_creator(pg_temp.u(1)), 'approval grants the role');
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.fails($q$ insert into public.role_requests (role, message) values ('creator', 'x') $q$, 'row-level security');

-- ---------------------------------------------------------------------------
-- Account manager and admin accounts
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(5));
select pg_temp.fails($q$ select public.admin_set_user_ban(pg_temp.u(4), now() + interval '1 day') $q$, 'forbidden');
select pg_temp.ok(pg_temp.touched($q$ update public.profiles set last_name = 'x' where user_id = pg_temp.u(4) $q$) = 0, 'manager cannot edit an admin');
select pg_temp.ok(pg_temp.touched($q$ update public.profiles set last_name = 'x' where user_id = pg_temp.u(2) $q$) = 1, 'manager edits a user');
select public.admin_set_user_ban(pg_temp.u(2), now() + interval '1 day');
select public.admin_set_user_ban(pg_temp.u(2), null);

-- ---------------------------------------------------------------------------
-- Profile pin: request
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.fails($q$ select public.submit_profile_pin(pg_temp.u(1), 19.4, -99.1, '', '', '', '{}') $q$, 'forbidden');
select pg_temp.fails($q$ select public.submit_profile_pin(pg_temp.u(2), 19.4, -99.1, '', '', '', '{}') $q$, 'first_name_required');

select pg_temp.act_as(pg_temp.u(1));
select pg_temp.keep('request', public.submit_profile_pin(pg_temp.u(1), 10, 10, 'México', '', '', array['es'])::text);
select pg_temp.ok(public.submit_profile_pin(pg_temp.u(1), 19.4, -99.1, 'México', 'CDMX', '', array['es'])::text = pg_temp.kept('request'), 'a new submission replaces the waiting one');
select pg_temp.ok((select count(*) = 1 and bool_and(title = 'Ana' and kind = 'family' and lat = 19.4) from public.pin_requests), 'owner sees the one request, filled by the server');
select pg_temp.fails($q$ insert into public.pin_requests (title, lat, lng, profile_user_id) values ('x', 1, 1, pg_temp.u(1)) $q$, 'row-level security');
select pg_temp.fails($q$ select public.review_profile_pin(pg_temp.kept('request')::uuid, true, now()) $q$, 'forbidden');

select pg_temp.act_as(pg_temp.u(7));
select pg_temp.ok(not exists (select 1 from public.pin_requests where profile_user_id is not null), 'pins.approve does not see profile requests');
select pg_temp.ok(pg_temp.touched($q$ update public.pin_requests set status = 'approved' where id = pg_temp.kept('request')::uuid $q$) = 0, 'pins.approve cannot review them');
select pg_temp.fails($q$ select public.review_profile_pin(pg_temp.kept('request')::uuid, true, now()) $q$, 'forbidden');

select pg_temp.act_as(pg_temp.u(3));
select pg_temp.keep('own_request', public.submit_profile_pin(pg_temp.u(3), 1, 1, '', '', '', '{}')::text);
select pg_temp.fails($q$ select public.review_profile_pin(pg_temp.kept('own_request')::uuid, true, (select created_at from public.pin_requests where id = pg_temp.kept('own_request')::uuid)) $q$, 'own_pin');
select pg_temp.fails($q$ select public.review_profile_pin(pg_temp.kept('request')::uuid, true, null) $q$, 'content_changed');
select public.review_profile_pin(id, true, created_at) from public.pin_requests where id = pg_temp.kept('request')::uuid;

select pg_temp.root();
select pg_temp.keep('pin', (select id::text from public.pins where profile_user_id = pg_temp.u(1)));

-- ---------------------------------------------------------------------------
-- Profile pin: visibility, content and messages
-- ---------------------------------------------------------------------------
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'hidden without opt-in');
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.ok(public.profile_pin_state(pg_temp.u(1)) = '{"authorized": true, "visible": false}', 'owner sees the state');
update public.profile_details set show_on_map = true where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'hidden without a verified testimony');
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.fails($q$ insert into public.messages (pin_id, body) values (pg_temp.kept('pin')::uuid, 'hola') $q$, 'pin_unavailable');

select pg_temp.act_as(pg_temp.u(3));
select public.verify_profile(user_id, 'testimony', true, testimony_updated_at) from public.profile_details where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok((select title = 'Ana' and description = 'Testimonio nuevo' and kind = 'family' from public.pins where id = pg_temp.kept('pin')::uuid), 'everyone sees the verified pin');
select pg_temp.fails($q$ select exact_lat from public.pins $q$, 'permission denied');
select pg_temp.fails($q$ select profile_user_id from public.pins $q$, 'permission denied');
select pg_temp.act_as(pg_temp.u(2));
insert into public.messages (pin_id, body) values (pg_temp.kept('pin')::uuid, 'hola');

select pg_temp.act_as(pg_temp.u(4));
select pg_temp.fails($q$ update public.pins set title = 'x' where id = pg_temp.kept('pin')::uuid $q$, 'profile_pin_readonly');
select pg_temp.fails($q$ delete from public.pin_contacts where pin_id = pg_temp.kept('pin')::uuid $q$, 'profile_pin_readonly');
select pg_temp.fails($q$ update public.pin_contacts set user_id = pg_temp.u(2) where pin_id = pg_temp.kept('pin')::uuid $q$, 'profile_pin_readonly');
select pg_temp.fails($q$ insert into public.pins (title, lat, lng, profile_user_id) values ('x', 1, 1, pg_temp.u(2)) $q$, 'profile_pin_readonly');
insert into public.pins (title, lat, lng) values ('QA normal pin', 1, 1);
select pg_temp.ok(pg_temp.touched($q$ update public.pins set title = 'QA normal pin 2' where title = 'QA normal pin' $q$) = 1, 'normal pins are still editable');

select pg_temp.act_as(pg_temp.u(1));
update public.profiles set first_name = 'Ana María' where user_id = pg_temp.u(1);
update public.profile_details set household = 'person' where user_id = pg_temp.u(1);
select pg_temp.ok((select title = 'Ana María' and kind = 'person' from public.pins where id = pg_temp.kept('pin')::uuid), 'name and type follow the profile');
update public.profile_details set testimony = 'Tercera versión' where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'editing the testimony hides the pin');
select pg_temp.act_as(pg_temp.u(2));
insert into public.messages (pin_id, body) values (pg_temp.kept('pin')::uuid, 'sigo aquí');
select pg_temp.act_as(pg_temp.u(6));
select pg_temp.fails($q$ insert into public.messages (pin_id, body) values (pg_temp.kept('pin')::uuid, 'nuevo') $q$, 'pin_unavailable');

select pg_temp.act_as(pg_temp.u(3));
select public.verify_profile(user_id, 'testimony', true, testimony_updated_at) from public.profile_details where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok((select description = 'Tercera versión' from public.pins where id = pg_temp.kept('pin')::uuid), 'revalidating shows the new text');
select pg_temp.act_as(pg_temp.u(1));
update public.profile_details set show_on_map = false where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'opting out hides it');
select pg_temp.act_as(pg_temp.u(1));
update public.profile_details set show_on_map = true where user_id = pg_temp.u(1);
select pg_temp.act_as(null);
select pg_temp.ok(exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'opting in again needs no new authorization');
select pg_temp.act_as(pg_temp.u(4));
select public.admin_set_user_ban(pg_temp.u(1), now() + interval '1 day');
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from public.pins where id = pg_temp.kept('pin')::uuid), 'a blocked account is hidden');
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.ok(pg_temp.touched($q$ update public.profile_details set home_description = 'x' where user_id = pg_temp.u(1) $q$) = 0, 'a blocked account edits nothing');
select pg_temp.act_as(pg_temp.u(4));
select public.admin_set_user_ban(pg_temp.u(1), null);
select pg_temp.ok((select count(*) = 1 and bool_and(visible) from public.admin_profile_pins() where user_id = pg_temp.u(1)), 'admin lists profile pins');
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.fails($q$ select * from public.admin_profile_pins() $q$, 'forbidden');

-- ---------------------------------------------------------------------------
-- Profile pin: moving
-- ---------------------------------------------------------------------------
select pg_temp.root();
select pg_temp.keep('lat', lat::text), pg_temp.keep('lng', lng::text) from public.pins where id = pg_temp.kept('pin')::uuid;
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.keep('request', public.submit_profile_pin(pg_temp.u(1), pg_temp.kept('lat')::float8 + 0.001, pg_temp.kept('lng')::float8, 'México', '', '', array['es'])::text);
select pg_temp.act_as(pg_temp.u(3));
select public.review_profile_pin(id, true, created_at) from public.pin_requests where id = pg_temp.kept('request')::uuid;
select pg_temp.root();
select pg_temp.ok(
  (select lat = pg_temp.kept('lat')::float8 and lng = pg_temp.kept('lng')::float8 and exact_lat = pg_temp.kept('lat')::float8 + 0.001
   from public.pins where id = pg_temp.kept('pin')::uuid),
  'a short move keeps the published point'
);
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.keep('request', public.submit_profile_pin(pg_temp.u(1), pg_temp.kept('lat')::float8 + 0.05, pg_temp.kept('lng')::float8, 'México', '', '', array['es'])::text);
select pg_temp.act_as(pg_temp.u(3));
select public.review_profile_pin(id, true, created_at) from public.pin_requests where id = pg_temp.kept('request')::uuid;
select pg_temp.root();
select pg_temp.ok(
  (select lat <> pg_temp.kept('lat')::float8
     and sqrt(power((lat - exact_lat) * 111320.0, 2) + power((lng - exact_lng) * 111320.0 * cos(radians(exact_lat)), 2)) <= 901
   from public.pins where id = pg_temp.kept('pin')::uuid),
  'a long move publishes a new point around the new place'
);
select pg_temp.act_as(pg_temp.u(1));
select pg_temp.keep('request', public.submit_profile_pin(pg_temp.u(1), 0, 0, '', '', '', '{}')::text);
select pg_temp.act_as(pg_temp.u(3));
select public.review_profile_pin(id, false, created_at) from public.pin_requests where id = pg_temp.kept('request')::uuid;
select pg_temp.root();
select pg_temp.ok(
  (select exact_lat <> 0 from public.pins where id = pg_temp.kept('pin')::uuid)
  and (select status = 'rejected' from public.pin_requests where id = pg_temp.kept('request')::uuid),
  'a rejected move changes nothing'
);
select pg_temp.act_as(pg_temp.u(4));
update public.profile_details set show_on_map = false where user_id = pg_temp.u(1);
select pg_temp.ok(pg_temp.touched($q$ delete from public.pins where id = pg_temp.kept('pin')::uuid $q$) = 0, 'a hidden pin is not reached by a plain delete');
select pg_temp.act_as(pg_temp.u(2));
select pg_temp.fails($q$ select public.admin_delete_profile_pin(pg_temp.kept('pin')::uuid) $q$, 'forbidden');
select pg_temp.act_as(pg_temp.u(4));
select public.admin_delete_profile_pin(pg_temp.kept('pin')::uuid);
select pg_temp.ok(not exists (select 1 from public.admin_profile_pins() where user_id = pg_temp.u(1)), 'pins.write deletes a profile pin');

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.u(5));
select pg_temp.ok(
  exists (select 1 from public.audit_log where entity_type = 'user')
  and not exists (select 1 from public.audit_log where entity_type in ('profile', 'profile_pin', 'profile_pin_request')),
  'users.manage reads no profile history'
);
select pg_temp.act_as(pg_temp.u(6));
select pg_temp.ok(
  exists (select 1 from public.audit_log where entity_type = 'profile')
  and not exists (select 1 from public.audit_log where entity_type not in ('profile', 'profile_pin', 'profile_pin_request')),
  'profiles.audit_read reads only profile history'
);
select pg_temp.act_as(pg_temp.u(3));
select pg_temp.ok(not exists (select 1 from public.audit_log), 'a validator reads no audit');
select pg_temp.root();
select pg_temp.ok(
  not exists (
    select 1
    from unnest(array[
      'profile.updated', 'profile.skills_changed', 'profile.trainings_changed', 'profile.backer_added',
      'profile.backer_removed', 'profile.verified', 'profile.verification_removed',
      'profile_pin_request.created', 'profile_pin_request.updated', 'profile_pin_request.approved',
      'profile_pin_request.rejected', 'profile_pin.updated', 'profile_pin.deleted', 'role.created', 'role.deleted',
      'role.permission_added', 'role_request.created', 'role_request.approved', 'user.role_changed', 'skill.updated'
    ]) as expected (action)
    where not exists (select 1 from public.audit_log a where a.action = expected.action)
  ),
  'every kind of change is recorded'
);
select pg_temp.ok(
  not exists (select 1 from public.audit_log where entity_type = 'pin' and entity_id = pg_temp.kept('pin')),
  'profile pins are not recorded as ordinary pins'
);

-- ---------------------------------------------------------------------------
-- Deleting an account takes its data with it
-- ---------------------------------------------------------------------------
delete from auth.users where id in (pg_temp.u(1), pg_temp.u(3));
select pg_temp.ok(
  not exists (select 1 from public.profile_details where user_id = pg_temp.u(1))
  and not exists (select 1 from public.user_skills where user_id = pg_temp.u(1))
  and not exists (select 1 from public.pin_requests where profile_user_id = pg_temp.u(1)),
  'account deletion cascades'
);

select 'all access tests passed' as result;

rollback;
