create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null unique,
  position int not null,
  alt text,
  created_at timestamptz not null default now()
);

create index project_images_project_position_idx on public.project_images (project_id, position);

-- Incremental position by default: next free slot within the project.
create function public.project_images_set_position()
returns trigger
language plpgsql
as $$
begin
  if new.position is null then
    select coalesce(max(position), -1) + 1 into new.position
    from public.project_images
    where project_id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger project_images_set_position
  before insert on public.project_images
  for each row execute function public.project_images_set_position();

alter table public.project_images enable row level security;

-- Public read only. Writes: add authenticated policies with the create/edit flow.
create policy "anon select" on public.project_images
  for select to anon using (true);

-- Public-read bucket. Uploads: add policies with the create/edit flow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
