-- What a pin is and who speaks there: type and languages (ISO 639 codes, at most 5), proposed with the
-- request and corrected by the admin who reviews it. Existing pins and requests keep them empty.
alter table public.pins
  add column languages text[] not null default '{}' check (cardinality(languages) <= 5),
  add column kind text check (kind in ('person', 'family', 'house_church', 'church'));

alter table public.pin_requests
  add column languages text[] not null default '{}' check (cardinality(languages) <= 5),
  add column kind text check (kind in ('person', 'family', 'house_church', 'church'));

-- Who answers for a pin (an existing user: by default whoever proposed it). Kept apart from `pins`,
-- which anyone can read: only admins see it for now. Messages to the contact come later and will reuse the inbox.
create table public.pin_contacts (
  pin_id uuid primary key references public.pins (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.pin_contacts enable row level security;
revoke all on public.pin_contacts from anon;

create policy "pin_contacts: admin" on public.pin_contacts
  for all to authenticated
  using ((select public.has_permission('pins.write')))
  with check ((select public.has_permission('pins.write')));
