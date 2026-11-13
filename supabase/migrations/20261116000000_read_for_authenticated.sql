-- A signed-in user queries as `authenticated`, not `anon`: the public-read policies
-- were `to anon` only, so after login pins and projects stopped loading.
drop policy if exists "dev: anon select" on public.pins;
create policy "public read" on public.pins
  for select to anon, authenticated using (true);

drop policy if exists "anon select" on public.projects;
create policy "public read" on public.projects
  for select to anon, authenticated using (true);

drop policy if exists "anon select" on public.project_images;
create policy "public read" on public.project_images
  for select to anon, authenticated using (true);

grant execute on function public.project_filter_options() to authenticated;
