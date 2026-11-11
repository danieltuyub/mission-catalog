create table public.pins (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  lat float8 not null,
  lng float8 not null,
  created_at timestamptz default now()
);

alter table public.pins enable row level security;

-- DEV ONLY: public anonymous access. Replace with authenticated policies before production.
create policy "dev: anon select" on public.pins
  for select to anon using (true);

create policy "dev: anon insert" on public.pins
  for insert to anon with check (true);

create policy "dev: anon update" on public.pins
  for update to anon using (true) with check (true);

create policy "dev: anon delete" on public.pins
  for delete to anon using (true);
