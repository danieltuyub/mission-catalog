-- Roles and permissions become rows: admins create roles and change what they can do, users hold several
-- roles, and can ask for the ones marked as requestable. Only the `admin` role manages roles.
-- Needs 20261118 (roles), 20261129 (user ban) and 20261202 (audit).
--
-- Additive: `admin_set_user_role(uuid, text)` stays for the current app (removed in a later migration).

-- ---------------------------------------------------------------------------
-- Permission catalog: grows only by migration
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  name_es text not null,
  name_en text not null,
  description_es text not null,
  description_en text not null
);

alter table public.permissions enable row level security;
revoke all on public.permissions from anon, authenticated;
grant select on public.permissions to authenticated;
grant all on public.permissions to service_role;

create policy "permissions: read" on public.permissions
  for select to authenticated using (true);

insert into public.permissions (key, name_es, name_en, description_es, description_en) values
  ('projects.view_detail', 'Ver detalle de proyectos', 'View project details', 'Ver la ficha completa de un proyecto.', 'See the full page of a project.'),
  ('projects.save', 'Guardar proyectos', 'Save projects', 'Guardar proyectos en Mi Espacio.', 'Save projects to My Space.'),
  ('projects.create', 'Crear proyectos', 'Create projects', 'Publicar proyectos nuevos.', 'Publish new projects.'),
  ('projects.update_own', 'Editar sus proyectos', 'Edit own projects', 'Editar los proyectos que uno creó.', 'Edit the projects one created.'),
  ('projects.update_any', 'Editar cualquier proyecto', 'Edit any project', 'Editar proyectos de cualquier persona.', 'Edit anyone''s projects.'),
  ('projects.delete_any', 'Eliminar proyectos', 'Delete projects', 'Eliminar cualquier proyecto.', 'Delete any project.'),
  ('pins.request', 'Solicitar pins', 'Request pins', 'Proponer un pin en el mapa.', 'Propose a pin on the map.'),
  ('pins.write', 'Gestionar pins', 'Manage pins', 'Crear, editar y eliminar pins del mapa.', 'Create, edit and delete map pins.'),
  ('pins.approve', 'Aprobar solicitudes de pin', 'Approve pin requests', 'Revisar las solicitudes de pin que no son de ficha.', 'Review pin requests other than profile ones.'),
  ('messages.send', 'Enviar mensajes', 'Send messages', 'Escribir a otras personas.', 'Write to other people.'),
  ('messages.moderate', 'Moderar mensajes', 'Moderate messages', 'Leer las conversaciones y el buzón de contacto.', 'Read conversations and the contact inbox.'),
  ('users.manage', 'Gestionar usuarios', 'Manage users', 'Crear, editar y bloquear cuentas que no son de administrador.', 'Create, edit and block non-admin accounts.'),
  ('profiles.read_all', 'Ver fichas', 'View profiles', 'Ver la ficha completa de cualquier usuario.', 'See any user''s full profile.'),
  ('profiles.verify', 'Validar fichas', 'Verify profiles', 'Validar testimonios y habilidades espirituales.', 'Verify testimonies and spiritual skills.'),
  ('profiles.edit_any', 'Editar fichas', 'Edit profiles', 'Editar fichas de cuentas que no son de administrador.', 'Edit profiles of non-admin accounts.'),
  ('profiles.authorize_pin', 'Autorizar pins de ficha', 'Authorize profile pins', 'Aprobar que una persona aparezca en el mapa.', 'Approve that a person shows on the map.'),
  ('profiles.audit_read', 'Ver historial de fichas', 'View profile history', 'Ver en auditoría los cambios de las fichas.', 'See profile changes in the audit trail.'),
  ('catalogs.manage', 'Gestionar catálogos', 'Manage catalogs', 'Administrar habilidades y capacitaciones.', 'Manage skills and trainings.');

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table public.roles (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{0,49}$'),
  name_es text not null check (char_length(btrim(name_es)) between 1 and 80),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 80),
  -- Seeded roles: they cannot be deleted.
  system boolean not null default false,
  requestable boolean not null default false,
  created_at timestamptz not null default now(),
  check (not requestable or id not in ('admin', 'subscriber'))
);

alter table public.roles enable row level security;
revoke all on public.roles from anon, authenticated;
grant select on public.roles to authenticated;
grant all on public.roles to service_role;

create policy "roles: read" on public.roles
  for select to authenticated using (true);

insert into public.roles (id, name_es, name_en, system, requestable) values
  ('subscriber', 'Suscriptor', 'Subscriber', true, false),
  ('creator', 'Creador', 'Creator', true, true),
  ('validator', 'Validador', 'Validator', true, false),
  ('admin', 'Administrador', 'Administrator', true, false);

alter table public.role_permissions
  drop constraint role_permissions_role_check,
  add constraint role_permissions_role_fkey foreign key (role) references public.roles (id) on delete cascade,
  add constraint role_permissions_permission_fkey foreign key (permission) references public.permissions (key);

-- Everyone holds `subscriber`, so the others keep only what they add on top of it.
delete from public.role_permissions
where role = 'creator' and permission in ('projects.view_detail', 'projects.save', 'messages.send', 'pins.request');

insert into public.role_permissions (role, permission) values
  ('validator', 'profiles.read_all'),
  ('validator', 'profiles.verify'),
  ('validator', 'profiles.authorize_pin')
on conflict do nothing;

alter table public.user_roles
  drop constraint user_roles_role_check,
  add constraint user_roles_role_fkey foreign key (role) references public.roles (id);

revoke insert, update, delete on public.user_roles from anon, authenticated;

insert into public.user_roles (user_id, role)
select id, 'subscriber' from auth.users
on conflict do nothing;

-- Whoever receives any role also holds the base one.
create function public.user_roles_keep_subscriber()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role) values (new.user_id, 'subscriber') on conflict do nothing;
  return null;
end;
$$;

create trigger user_roles_keep_subscriber
  after insert on public.user_roles
  for each row when (new.role <> 'subscriber')
  execute function public.user_roles_keep_subscriber();

-- ---------------------------------------------------------------------------
-- Questions about accounts
-- ---------------------------------------------------------------------------
create function public.is_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where id = uid and banned_until > now());
$$;

create function public.is_admin_account(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = 'admin');
$$;

-- The caller holds the admin role (and is not blocked). Not a permission: it cannot be handed out.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin_account((select auth.uid())) and not public.is_banned((select auth.uid()));
$$;

revoke all on function public.is_banned(uuid), public.is_admin_account(uuid), public.is_admin() from public, anon;
grant execute on function public.is_banned(uuid), public.is_admin_account(uuid), public.is_admin() to authenticated;

-- Someone interested people can write to: whoever can create projects.
create or replace function public.is_creator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid
      and (
        ur.role = 'admin'
        or exists (
          select 1 from public.role_permissions rp
          where rp.role = ur.role and rp.permission = 'projects.create'
        )
      )
  );
$$;

grant select on public.role_permissions to authenticated;
create policy "role_permissions: admin read" on public.role_permissions
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Role management (admin only)
-- ---------------------------------------------------------------------------
-- A user's roles, replaced as a whole. `subscriber` always stays; nobody changes their own.
create function public.admin_set_user_role(target uuid, new_roles text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text[];
  held text[];
begin
  -- Two admins demoting each other at once must not leave nobody.
  perform pg_advisory_xact_lock(hashtext('public.admin_accounts'));
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'own_role';
  end if;
  if not exists (select 1 from auth.users where id = target) then
    raise exception 'not_found';
  end if;

  wanted := array(
    select distinct r from unnest(coalesce(new_roles, '{}'::text[]) || array['subscriber']) as r order by r
  );
  if exists (
    select 1 from unnest(wanted) as w (id)
    where not exists (select 1 from public.roles r where r.id = w.id)
  ) then
    raise exception 'invalid_role';
  end if;

  held := array(select role from public.user_roles where user_id = target order by role);
  delete from public.user_roles where user_id = target and role <> all (wanted);
  insert into public.user_roles (user_id, role)
  select target, w.id from unnest(wanted) as w (id)
  on conflict do nothing;

  if held is distinct from wanted then
    perform public.audit_write(
      'user.role_changed', 'user', target::text, public.audit_user_email(target),
      jsonb_build_object('roles', held), jsonb_build_object('roles', wanted)
    );
  end if;
end;
$$;

-- The current app still sends one role.
create or replace function public.admin_set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_set_user_role(target, array[new_role]);
end;
$$;

-- Creates a role (`role_id` null) or edits one, with its permissions as a whole. Returns the id.
create function public.admin_save_role(
  role_id text,
  role_name_es text,
  role_name_en text,
  is_requestable boolean,
  permission_keys text[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid text := role_id;
  base text;
  n int := 1;
  wanted text[] := coalesce(permission_keys, '{}'::text[]);
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if rid = 'admin' then
    raise exception 'admin_role_locked';
  end if;
  if exists (
    select 1 from unnest(wanted) as w (key)
    where not exists (select 1 from public.permissions p where p.key = w.key)
  ) then
    raise exception 'invalid_permission';
  end if;

  if rid is null then
    perform pg_advisory_xact_lock(hashtext('public.roles'));
    base := btrim(regexp_replace(lower(coalesce(role_name_en, '')), '[^a-z0-9]+', '_', 'g'), '_');
    if base !~ '^[a-z]' then
      base := btrim('role_' || base, '_');
    end if;
    base := left(base, 40);
    rid := base;
    while exists (select 1 from public.roles r where r.id = rid) loop
      n := n + 1;
      rid := base || '_' || n;
    end loop;
    insert into public.roles (id, name_es, name_en, requestable)
    values (rid, btrim(role_name_es), btrim(role_name_en), coalesce(is_requestable, false));
  else
    update public.roles r
    set name_es = btrim(role_name_es),
        name_en = btrim(role_name_en),
        requestable = coalesce(is_requestable, false) and r.id <> 'subscriber'
    where r.id = rid;
    if not found then
      raise exception 'not_found';
    end if;
  end if;

  delete from public.role_permissions rp where rp.role = rid and rp.permission <> all (wanted);
  insert into public.role_permissions (role, permission)
  select distinct rid, w.key from unnest(wanted) as w (key)
  on conflict do nothing;
  return rid;
end;
$$;

create function public.admin_delete_role(role_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_system boolean;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select r.system into is_system from public.roles r where r.id = admin_delete_role.role_id;
  if not found then
    raise exception 'not_found';
  end if;
  if is_system then
    raise exception 'system_role';
  end if;
  if exists (select 1 from public.user_roles ur where ur.role = admin_delete_role.role_id) then
    raise exception 'role_in_use';
  end if;
  delete from public.roles r where r.id = admin_delete_role.role_id;
end;
$$;

revoke all on function
  public.admin_set_user_role(uuid, text[]),
  public.admin_save_role(text, text, text, boolean, text[]),
  public.admin_delete_role(text)
from public, anon;
grant execute on function
  public.admin_set_user_role(uuid, text[]),
  public.admin_save_role(text, text, text, boolean, text[]),
  public.admin_delete_role(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Role requests: a user asks, an admin decides
-- ---------------------------------------------------------------------------
create table public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null references public.roles (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- One waiting at a time.
create unique index role_requests_one_pending_idx on public.role_requests (user_id) where status = 'pending';
create index role_requests_status_idx on public.role_requests (status, created_at);

alter table public.role_requests enable row level security;
revoke all on public.role_requests from anon, authenticated;
grant select on public.role_requests to authenticated;
grant insert (role, message) on public.role_requests to authenticated;
grant all on public.role_requests to service_role;

create policy "role_requests: read" on public.role_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "role_requests: create" on public.role_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and not (select public.is_banned((select auth.uid())))
    and exists (select 1 from public.roles r where r.id = role_requests.role and r.requestable)
    and not exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = role_requests.role
    )
  );

create function public.review_role_request(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.role_requests;
  held text[];
begin
  perform pg_advisory_xact_lock(hashtext('public.admin_accounts'));
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into req from public.role_requests r where r.id = request_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if req.status <> 'pending' then
    raise exception 'already_reviewed';
  end if;
  if req.user_id = (select auth.uid()) then
    raise exception 'own_role';
  end if;

  update public.role_requests r
  set status = case when approve then 'approved' else 'rejected' end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where r.id = request_id;

  if approve then
    held := array(select role from public.user_roles where user_id = req.user_id order by role);
    insert into public.user_roles (user_id, role) values (req.user_id, req.role) on conflict do nothing;
    perform public.audit_write(
      'user.role_changed', 'user', req.user_id::text, public.audit_user_email(req.user_id),
      jsonb_build_object('roles', held),
      jsonb_build_object('roles', array(select role from public.user_roles where user_id = req.user_id order by role))
    );
  end if;
end;
$$;

revoke all on function public.review_role_request(uuid, boolean) from public, anon;
grant execute on function public.review_role_request(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- `users.manage` outside the admin role never touches admin accounts
-- ---------------------------------------------------------------------------
drop policy "profiles: update by admin" on public.profiles;
create policy "profiles: update by admin" on public.profiles
  for update to authenticated
  using (
    (select public.has_permission('users.manage'))
    and ((select public.is_admin()) or not public.is_admin_account(user_id))
  )
  with check (
    (select public.has_permission('users.manage'))
    and ((select public.is_admin()) or not public.is_admin_account(user_id))
  );

create or replace function public.admin_set_user_ban(target uuid, until_ts timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.admin_accounts'));
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.is_admin() and public.is_admin_account(target) then
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
