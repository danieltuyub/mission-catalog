alter table public.pins add column image_path text;

-- Public-read bucket; the client compresses to WebP before uploading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pin-images', 'pin-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- DEV ONLY: anonymous upload/delete. Replace with authenticated policies before production.
create policy "dev: anon upload pin images" on storage.objects
  for insert to anon with check (bucket_id = 'pin-images');

create policy "dev: anon delete pin images" on storage.objects
  for delete to anon using (bucket_id = 'pin-images');
