-- Pin requests: subscribers and creators propose a pin from the map; an admin reviews it later
-- (the review panel comes in another step). Admins keep creating pins directly (`pins.write`).
-- Needs 20261118 (roles, `has_permission`).

-- Permissions. `pins.approve` has no rows: admins hold everything.
insert into public.role_permissions (role, permission) values
  ('subscriber', 'pins.request'),
  ('creator', 'pins.request')
on conflict do nothing;

create table public.pin_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  lat float8 not null check (lat between -90 and 90),
  lng float8 not null check (lng between -180 and 180),
  -- Path inside the private `pin-request-images` bucket, always under the requester's own folder.
  image_path text check (image_path is null or image_path like requested_by::text || '/%'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index pin_requests_user_idx on public.pin_requests (requested_by, created_at desc);
create index pin_requests_status_idx on public.pin_requests (status, created_at);

alter table public.pin_requests enable row level security;
revoke all on public.pin_requests from anon;

-- Everyone sees their own requests; reviewers see all.
create policy "pin_requests: read" on public.pin_requests
  for select to authenticated
  using (requested_by = (select auth.uid()) or (select public.has_permission('pins.approve')));

-- Requesters can only file their own, as pending, with at most 5 waiting for review.
-- Reviewing (update/delete) arrives with the approval panel.
create policy "pin_requests: create" on public.pin_requests
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'pending'
    and (select public.has_permission('pins.request'))
    and (
      select count(*) from public.pin_requests r
      where r.requested_by = (select auth.uid()) and r.status = 'pending'
    ) < 5
  );

-- Private bucket: a pending request's photo is visible only to its owner and to reviewers.
-- Approval will copy it to the public `pin-images` bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pin-request-images', 'pin-request-images', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "pin request images: insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pin-request-images'
    and (select public.has_permission('pins.request'))
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "pin request images: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pin-request-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.has_permission('pins.approve')))
  );
-- The owner can remove what they uploaded (the client cleans up when a request fails to save).
create policy "pin request images: delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pin-request-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.has_permission('pins.approve')))
  );
