-- Roles. Rows are managed from the SQL editor / service role only (no write policies).
-- First admin (run once in the SQL editor, with the id from Authentication > Users):
--   insert into public.user_roles (user_id, role) values ('<auth user id>', 'admin');
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- security definer: reads user_roles regardless of the caller's RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- pins: replace the dev policies. Public read stays; writes are admin only.
drop policy if exists "dev: anon insert" on public.pins;
drop policy if exists "dev: anon update" on public.pins;
drop policy if exists "dev: anon delete" on public.pins;

create policy "admin insert" on public.pins
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin update" on public.pins
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete" on public.pins
  for delete to authenticated using ((select public.is_admin()));

-- projects and project_images: public read (existing), admin writes.
create policy "admin insert" on public.projects
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin update" on public.projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete" on public.projects
  for delete to authenticated using ((select public.is_admin()));

create policy "admin insert" on public.project_images
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin update" on public.project_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete" on public.project_images
  for delete to authenticated using ((select public.is_admin()));

-- Storage: replace the dev policies; images are admin-write, public-read (public buckets).
drop policy if exists "dev: anon upload pin images" on storage.objects;
drop policy if exists "dev: anon delete pin images" on storage.objects;

create policy "admin upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('pin-images', 'project-images') and (select public.is_admin()));
create policy "admin update images" on storage.objects
  for update to authenticated
  using (bucket_id in ('pin-images', 'project-images') and (select public.is_admin()))
  with check (bucket_id in ('pin-images', 'project-images') and (select public.is_admin()));
create policy "admin delete images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('pin-images', 'project-images') and (select public.is_admin()));
