create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  responsible text,
  description text,
  started_at date,
  country text,
  region text,
  phone text,
  mail text,
  status text not null default 'open' check (status in ('open', 'closed', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- Public read only (contact data is meant to be shown). Writes: add authenticated policies when needed.
create policy "anon select" on public.projects
  for select to anon using (true);
