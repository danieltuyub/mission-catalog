-- Gives the Data API roles access to schema `public` the way older Supabase projects did by default, so new
-- tables need no GRANT of their own. Run in the SQL Editor, once per project.
--
-- - On an empty project, before its first migration: section 1 alone is enough.
-- - On a project that already has the migrations: the whole script. Do not run it again after a newer
--   migration restricts access: section 2 would reopen it (add its statements to section 3 first).
--
-- WARNING: from then on every new table is reachable with the publishable key. Row level security is what
-- protects it: enable it, with its policies, in the same migration that creates the table.

begin;

-- 1. Objects created from now on (by `postgres`: migrations and the SQL Editor).
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;

-- 2. Objects that already exist. This also opens what the migrations closed: section 3 closes it again,
-- in the same transaction. Never run this section without section 3.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- 3. The grants and revokes of the migrations up to 20261202000000_audit_log.sql, in order.
-- (Statements on `is_admin()` are left out: a later migration drops that function.)

-- 20261112000000_project_filter_options.sql
grant execute on function public.project_filter_options() to anon;

-- 20261116000000_read_for_authenticated.sql
grant execute on function public.project_filter_options() to authenticated;

-- 20261118000000_roles_permissions.sql
revoke all on public.role_permissions from anon, authenticated;
revoke all on function public.has_permission(text), public.is_creator(uuid), public.my_permissions(), public.can_edit_project(uuid), public.can_edit_project_path(text) from public, anon;
grant execute on function public.has_permission(text), public.is_creator(uuid), public.my_permissions(), public.can_edit_project(uuid), public.can_edit_project_path(text) to authenticated;
revoke select on public.projects from anon;
grant select (id, name, responsible, description, started_at, country, region, status, created_by, created_at, updated_at) on public.projects to anon;
revoke all on public.profiles from anon;
revoke all on public.saved_projects from anon;
revoke all on public.messages from anon;
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- 20261120000000_pin_requests.sql
revoke all on public.pin_requests from anon;

-- 20261121000000_conversations.sql
revoke all on public.conversations from anon;
revoke insert, update, delete on public.conversations from authenticated;

-- 20261122000000_fix_pin_requests_policy.sql
revoke all on function public.pending_pin_requests(uuid) from public, anon;
grant execute on function public.pending_pin_requests(uuid) to authenticated;

-- 20261123000000_admin_panel.sql
revoke update on public.pin_requests from authenticated;
grant update (status) on public.pin_requests to authenticated;
revoke all on function public.admin_list_users(), public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_user_role(uuid, text) to authenticated;

-- 20261125000000_pin_attributes.sql
revoke all on public.pin_contacts from anon;

-- 20261126000000_pin_location_privacy.sql
revoke all on function public.fuzz_location(float8, float8) from public, anon, authenticated;
revoke select on public.pins from anon, authenticated;
grant select (id, title, description, lat, lng, created_at, image_path, country, region, city, languages, kind) on public.pins to anon, authenticated;
revoke all on function public.admin_pin_locations() from public, anon;
grant execute on function public.admin_pin_locations() to authenticated;

-- 20261127000000_pin_privacy_radius.sql
revoke all on function public.fuzz_location(float8, float8) from public, anon, authenticated;

-- 20261128000000_pin_messages.sql
revoke all on function public.is_pin_contact(uuid, uuid), public.pin_contact_state(uuid) from public;
grant execute on function public.pin_contact_state(uuid) to anon, authenticated;
grant execute on function public.is_pin_contact(uuid, uuid) to authenticated;

-- 20261129000000_user_ban.sql
revoke all on function public.admin_list_users(), public.admin_set_user_ban(uuid, timestamptz) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_user_ban(uuid, timestamptz) to authenticated;

-- 20261130000000_profile_language.sql
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- 20261201000000_contact_messages.sql
revoke all on public.contact_messages from anon, authenticated;
grant insert (name, contact, body, language) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (read_at) on public.contact_messages to authenticated;

-- 20261202000000_audit_log.sql
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
revoke all on function public.audit_write(text, text, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.audit_user_email(uuid) from public, anon, authenticated;
revoke all on function public.audit_user_created(uuid, text), public.audit_logout() from public, anon;
grant execute on function public.audit_user_created(uuid, text), public.audit_logout() to authenticated;

commit;
