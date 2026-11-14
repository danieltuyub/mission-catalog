-- Roles as data: a role is a set of permissions. Policies ask `has_permission('x')`, so adding
-- a role or changing what one can do is an INSERT into role_permissions, not a policy rewrite.
--
--   guest       no session; public read only (not a row anywhere)
--   subscriber  save projects, send messages
--   creator     + create projects, edit their own
--   admin       everything (implicit: `has_permission` is true for admins)
--
-- Roles are assigned from the SQL editor / service role (no write policy on user_roles yet):
--   insert into public.user_roles (user_id, role) values ('<auth user id>', 'creator');

-- ---------------------------------------------------------------------------
-- Roles and permissions
-- ---------------------------------------------------------------------------
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check check (role in ('admin', 'creator', 'subscriber'));

create table public.role_permissions (
  role text not null check (role in ('admin', 'creator', 'subscriber')),
  permission text not null,
  primary key (role, permission)
);

-- Read through the security definer functions below only.
alter table public.role_permissions enable row level security;
revoke all on public.role_permissions from anon, authenticated;

insert into public.role_permissions (role, permission) values
  ('subscriber', 'projects.view_detail'),
  ('subscriber', 'projects.save'),
  ('subscriber', 'messages.send'),
  ('creator', 'projects.view_detail'),
  ('creator', 'projects.save'),
  ('creator', 'messages.send'),
  ('creator', 'projects.create'),
  ('creator', 'projects.update_own');
-- Admin-only (no rows needed): projects.update_any, projects.delete_any, pins.write, users.manage

-- True when any of the caller's roles grants `p`. Admins are granted everything.
create function public.has_permission(p text)
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
      and (
        ur.role = 'admin'
        or exists (
          select 1 from public.role_permissions rp
          where rp.role = ur.role and rp.permission = p
        )
      )
  );
$$;

-- Creator or admin: someone interested people can write to.
create function public.is_creator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role in ('creator', 'admin')
  );
$$;

-- What the frontend needs in one call: { roles: [...], permissions: [...] } ('*' for admins).
create function public.my_permissions()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'roles',
    coalesce(
      (select jsonb_agg(role order by role) from public.user_roles where user_id = (select auth.uid())),
      '[]'::jsonb
    ),
    'permissions',
    coalesce(
      case
        when exists (
          select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'
        ) then '["*"]'::jsonb
      end,
      (
        select coalesce(jsonb_agg(distinct rp.permission), '[]'::jsonb)
        from public.user_roles ur
        join public.role_permissions rp on rp.role = ur.role
        where ur.user_id = (select auth.uid())
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Project ownership
-- ---------------------------------------------------------------------------
-- Existing projects stay without owner (null): only admins can edit them until assigned.
alter table public.projects
  add column created_by uuid references auth.users (id) on delete set null default auth.uid();

-- Admins edit any project; creators edit the ones they created.
create function public.can_edit_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('projects.update_any')
    or (
      public.has_permission('projects.update_own')
      and exists (
        select 1 from public.projects p
        where p.id = pid and p.created_by = (select auth.uid())
      )
    );
$$;

-- Storage paths are `<project id>/<file>`; anything else is not editable.
create function public.can_edit_project_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(object_name))[1])::uuid)
    else false
  end;
$$;

revoke all on function
  public.has_permission(text),
  public.is_creator(uuid),
  public.my_permissions(),
  public.can_edit_project(uuid),
  public.can_edit_project_path(text)
from public, anon;
grant execute on function
  public.has_permission(text),
  public.is_creator(uuid),
  public.my_permissions(),
  public.can_edit_project(uuid),
  public.can_edit_project_path(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Rewrite the policies that used is_admin()
-- ---------------------------------------------------------------------------
-- pins: admin only
drop policy if exists "admin insert" on public.pins;
drop policy if exists "admin update" on public.pins;
drop policy if exists "admin delete" on public.pins;

create policy "pins: insert" on public.pins
  for insert to authenticated with check ((select public.has_permission('pins.write')));
create policy "pins: update" on public.pins
  for update to authenticated
  using ((select public.has_permission('pins.write')))
  with check ((select public.has_permission('pins.write')));
create policy "pins: delete" on public.pins
  for delete to authenticated using ((select public.has_permission('pins.write')));

-- projects
drop policy if exists "admin insert" on public.projects;
drop policy if exists "admin update" on public.projects;
drop policy if exists "admin delete" on public.projects;

create policy "projects: insert" on public.projects
  for insert to authenticated
  with check (
    public.has_permission('projects.create')
    and (created_by = (select auth.uid()) or public.has_permission('projects.update_any'))
  );

create policy "projects: update" on public.projects
  for update to authenticated
  using (public.can_edit_project(id))
  with check (
    public.has_permission('projects.update_any')
    or (public.has_permission('projects.update_own') and created_by = (select auth.uid()))
  );

create policy "projects: delete (admin)" on public.projects
  for delete to authenticated using ((select public.has_permission('projects.delete_any')));

-- Undo for a failed creation (photos could not be saved): the owner may remove a project
-- they just created while it still has no photos. Real deletion comes later (soft delete).
create policy "projects: undo own empty new project" on public.projects
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    and public.has_permission('projects.create')
    and created_at > now() - interval '5 minutes'
    and not exists (select 1 from public.project_images i where i.project_id = projects.id)
  );

-- project_images
drop policy if exists "admin insert" on public.project_images;
drop policy if exists "admin update" on public.project_images;
drop policy if exists "admin delete" on public.project_images;
drop policy if exists "public read" on public.project_images;

create policy "project_images: guests see the cover only" on public.project_images
  for select to anon using (position = 0);
create policy "project_images: members see all" on public.project_images
  for select to authenticated using (true);

create policy "project_images: insert" on public.project_images
  for insert to authenticated with check (public.can_edit_project(project_id));
create policy "project_images: update" on public.project_images
  for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "project_images: delete" on public.project_images
  for delete to authenticated using (public.can_edit_project(project_id));

-- storage
drop policy if exists "admin upload images" on storage.objects;
drop policy if exists "admin update images" on storage.objects;
drop policy if exists "admin delete images" on storage.objects;

create policy "pin images: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pin-images' and (select public.has_permission('pins.write')));
create policy "pin images: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'pin-images' and (select public.has_permission('pins.write')))
  with check (bucket_id = 'pin-images' and (select public.has_permission('pins.write')));
create policy "pin images: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pin-images' and (select public.has_permission('pins.write')));

create policy "project images: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and public.can_edit_project_path(name));
create policy "project images: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and public.can_edit_project_path(name))
  with check (bucket_id = 'project-images' and public.can_edit_project_path(name));
create policy "project images: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and public.can_edit_project_path(name));

drop function public.is_admin();

-- ---------------------------------------------------------------------------
-- Guests: no contact data and no long text. Column privileges apply to `anon` only.
-- (`select *` fails for guests: the frontend lists columns explicitly.)
-- ---------------------------------------------------------------------------
revoke select on public.projects from anon;
grant select (id, name, responsible, description, started_at, country, region, status, created_by, created_at, updated_at)
  on public.projects to anon;

-- ---------------------------------------------------------------------------
-- Profiles (private: each user reads and edits their own)
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.manage')));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into public.profiles (user_id) select id from auth.users on conflict do nothing;

-- Every new auth user gets a profile and the subscriber role (they cannot pick another one).
-- Names come from the sign-up metadata: signUp({ options: { data: { first_name, last_name } } }).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (
    new.id,
    coalesce(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    coalesce(btrim(new.raw_user_meta_data ->> 'last_name'), '')
  )
  on conflict do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'subscriber') on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Saved projects
-- ---------------------------------------------------------------------------
create table public.saved_projects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.saved_projects enable row level security;
revoke all on public.saved_projects from anon;

create policy "saved: read own" on public.saved_projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved: save" on public.saved_projects
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_permission('projects.save')));
create policy "saved: unsave" on public.saved_projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Messages: two-way chat between interested people and creators.
-- One flat table; a conversation is the pair of people (optionally tied to a project).
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  sender_name text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

-- The server decides who sends and receives: nothing here is taken on trust from the client.
create function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.sender_id := auth.uid();
  -- Written from a project page: it goes to whoever created that project.
  if new.recipient_id is null and new.project_id is not null then
    select created_by into new.recipient_id from public.projects where id = new.project_id;
  end if;
  select btrim(first_name || ' ' || last_name) into new.sender_name
  from public.profiles where user_id = new.sender_id;
  new.sender_name := coalesce(new.sender_name, '');
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

alter table public.messages enable row level security;
revoke all on public.messages from anon;

create policy "messages: read mine" on public.messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-- At least one side must be a creator (or admin): interested <-> creator, in both directions.
create policy "messages: send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.has_permission('messages.send'))
    and (public.is_creator(recipient_id) or public.is_creator(sender_id))
  );

-- The recipient can only mark as read (column privilege, see below).
create policy "messages: mark read" on public.messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Live updates for the future chat/panel (RLS still decides who receives what).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
