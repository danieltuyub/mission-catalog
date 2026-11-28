-- Extended profile ("ficha"): testimony, origin, skills, trainings, backers and verifications.
-- Visible to its owner and to whoever holds a `profiles.*` permission.
-- Needs 20261203 (roles as data: `is_banned`, `is_admin`, `is_admin_account`).

-- ---------------------------------------------------------------------------
-- Who may read and edit a profile
-- ---------------------------------------------------------------------------
-- Any `profiles.*` permission implies reading every profile.
create function public.has_profile_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('profiles.read_all')
    or public.has_permission('profiles.verify')
    or public.has_permission('profiles.edit_any')
    or public.has_permission('profiles.authorize_pin')
    or public.has_permission('profiles.audit_read');
$$;

create function public.can_read_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(target = (select auth.uid()), false) or public.has_profile_access();
$$;

-- The owner (unless blocked), or `profiles.edit_any`, which outside the admin role skips admin accounts.
create function public.can_edit_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(target = (select auth.uid()) and not public.is_banned(target), false)
    or (
      public.has_permission('profiles.edit_any')
      and (public.is_admin() or not public.is_admin_account(target))
    );
$$;

revoke all on function public.has_profile_access(), public.can_read_profile(uuid), public.can_edit_profile(uuid) from public, anon;
grant execute on function public.has_profile_access(), public.can_read_profile(uuid), public.can_edit_profile(uuid) to authenticated;

-- Names of the people whose profile is being read (never their email).
create policy "profiles: read by profile permissions" on public.profiles
  for select to authenticated
  using ((select public.has_profile_access()));

-- ---------------------------------------------------------------------------
-- Details: one row per user, created with the account
-- ---------------------------------------------------------------------------
create table public.profile_details (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household text not null default 'person' check (household in ('person', 'family')),
  testimony text not null default '' check (char_length(testimony) <= 2000),
  -- Kept by triggers: what a verifier read, to refuse validating text that changed meanwhile.
  testimony_updated_at timestamptz,
  spiritual_skills_updated_at timestamptz,
  home_country text not null default '' check (char_length(home_country) <= 100),
  home_description text not null default '' check (char_length(home_description) <= 500),
  show_on_map boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profile_details_home_country_idx on public.profile_details (home_country);

alter table public.profile_details enable row level security;
revoke all on public.profile_details from anon, authenticated;
grant select on public.profile_details to authenticated;
grant update (household, testimony, home_country, home_description, show_on_map) on public.profile_details to authenticated;
grant all on public.profile_details to service_role;

create policy "profile_details: read" on public.profile_details
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_profile_access()));
create policy "profile_details: update" on public.profile_details
  for update to authenticated
  using (public.can_edit_profile(user_id))
  with check (public.can_edit_profile(user_id));

create function public.profile_details_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.testimony := btrim(new.testimony, E' \t\r\n');
  if tg_op = 'INSERT' then
    new.testimony_updated_at := case when new.testimony <> '' then clock_timestamp() end;
  else
    new.testimony_updated_at :=
      case when new.testimony is distinct from old.testimony then clock_timestamp() else old.testimony_updated_at end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger profile_details_before_write
  before insert or update on public.profile_details
  for each row execute function public.profile_details_before_write();

create function public.profiles_create_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_details (user_id) values (new.user_id) on conflict do nothing;
  return null;
end;
$$;

create trigger profiles_create_details
  after insert on public.profiles
  for each row execute function public.profiles_create_details();

insert into public.profile_details (user_id)
select user_id from public.profiles
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Catalogs: deactivated, not deleted, while in use
-- ---------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('manual', 'spiritual')),
  name_es text not null check (char_length(btrim(name_es)) between 1 and 100),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 100),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create unique index skills_name_idx on public.skills (category, lower(btrim(name_es)));

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create unique index trainings_name_idx on public.trainings (lower(btrim(name)));

-- Moving a skill between categories would change what was verified.
create function public.skills_keep_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'category_is_fixed';
end;
$$;

create trigger skills_keep_category
  before update on public.skills
  for each row when (old.category is distinct from new.category)
  execute function public.skills_keep_category();

alter table public.skills enable row level security;
alter table public.trainings enable row level security;
revoke all on public.skills, public.trainings from anon, authenticated;
grant select, insert, update, delete on public.skills, public.trainings to authenticated;
grant all on public.skills, public.trainings to service_role;

create policy "skills: read" on public.skills for select to authenticated using (true);
create policy "skills: insert" on public.skills
  for insert to authenticated with check ((select public.has_permission('catalogs.manage')));
create policy "skills: update" on public.skills
  for update to authenticated
  using ((select public.has_permission('catalogs.manage')))
  with check ((select public.has_permission('catalogs.manage')));
create policy "skills: delete" on public.skills
  for delete to authenticated using ((select public.has_permission('catalogs.manage')));

create policy "trainings: read" on public.trainings for select to authenticated using (true);
create policy "trainings: insert" on public.trainings
  for insert to authenticated with check ((select public.has_permission('catalogs.manage')));
create policy "trainings: update" on public.trainings
  for update to authenticated
  using ((select public.has_permission('catalogs.manage')))
  with check ((select public.has_permission('catalogs.manage')));
create policy "trainings: delete" on public.trainings
  for delete to authenticated using ((select public.has_permission('catalogs.manage')));

insert into public.skills (category, name_es, name_en, position) values
  ('manual', 'Electricista', 'Electrician', 1),
  ('manual', 'Plomería', 'Plumbing', 2),
  ('manual', 'Carpintería', 'Carpentry', 3),
  ('spiritual', 'Enseñar', 'Teaching', 1),
  ('spiritual', 'Predicar', 'Preaching', 2),
  ('spiritual', 'Bautizar', 'Baptizing', 3),
  ('spiritual', 'Discipular', 'Discipling', 4);

insert into public.trainings (name, position) values
  ('TLR Luke 10 School', 1),
  ('PTS School', 2),
  ('CFTN', 3);

-- ---------------------------------------------------------------------------
-- What each user holds: written through the functions below only
-- ---------------------------------------------------------------------------
create table public.user_skills (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  primary key (user_id, skill_id)
);

create table public.user_trainings (
  user_id uuid not null references auth.users (id) on delete cascade,
  training_id uuid not null references public.trainings (id) on delete restrict,
  primary key (user_id, training_id)
);

create index user_skills_skill_idx on public.user_skills (skill_id);
create index user_trainings_training_idx on public.user_trainings (training_id);

alter table public.user_skills enable row level security;
alter table public.user_trainings enable row level security;
revoke all on public.user_skills, public.user_trainings from anon, authenticated;
grant select on public.user_skills, public.user_trainings to authenticated;
grant all on public.user_skills, public.user_trainings to service_role;

create policy "user_skills: read" on public.user_skills
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_profile_access()));
create policy "user_trainings: read" on public.user_trainings
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_profile_access()));

-- ---------------------------------------------------------------------------
-- Backers: up to 5, each reachable by phone or email
-- ---------------------------------------------------------------------------
create table public.profile_backers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ministry', 'church', 'pastor', 'person', 'other')),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 200),
  created_at timestamptz not null default now(),
  check (btrim(phone) <> '' or btrim(email) <> '')
);

create index profile_backers_user_idx on public.profile_backers (user_id, created_at);

create function public.profile_backers_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Two inserts at once must not both see room for one more.
  perform pg_advisory_xact_lock(hashtextextended('profile_backers' || new.user_id::text, 0));
  if (select count(*) from public.profile_backers where user_id = new.user_id) >= 5 then
    raise exception 'too_many_backers';
  end if;
  return new;
end;
$$;

create trigger profile_backers_limit
  before insert on public.profile_backers
  for each row execute function public.profile_backers_limit();

alter table public.profile_backers enable row level security;
revoke all on public.profile_backers from anon, authenticated;
grant select, delete on public.profile_backers to authenticated;
grant insert (user_id, kind, name, phone, email) on public.profile_backers to authenticated;
grant update (kind, name, phone, email) on public.profile_backers to authenticated;
grant all on public.profile_backers to service_role;

create policy "profile_backers: read" on public.profile_backers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_profile_access()));
create policy "profile_backers: insert" on public.profile_backers
  for insert to authenticated with check (public.can_edit_profile(user_id));
create policy "profile_backers: update" on public.profile_backers
  for update to authenticated
  using (public.can_edit_profile(user_id))
  with check (public.can_edit_profile(user_id));
create policy "profile_backers: delete" on public.profile_backers
  for delete to authenticated using (public.can_edit_profile(user_id));

-- ---------------------------------------------------------------------------
-- Verifications: history; the current one has no `invalidated_at`
-- ---------------------------------------------------------------------------
create table public.profile_verifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (subject in ('testimony', 'spiritual_skills')),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz not null default clock_timestamp(),
  invalidated_at timestamptz
);

create unique index profile_verifications_current_idx
  on public.profile_verifications (user_id, subject) where invalidated_at is null;
create index profile_verifications_user_idx on public.profile_verifications (user_id, verified_at desc);

alter table public.profile_verifications enable row level security;
revoke all on public.profile_verifications from anon, authenticated;
grant select on public.profile_verifications to authenticated;
grant all on public.profile_verifications to service_role;

create policy "profile_verifications: read" on public.profile_verifications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_profile_access()));

create function public.invalidate_verification(target uuid, what text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profile_verifications
  set invalidated_at = clock_timestamp()
  where user_id = target and subject = what and invalidated_at is null;
$$;

revoke all on function public.invalidate_verification(uuid, text) from public, anon, authenticated;

create function public.profile_details_invalidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.invalidate_verification(new.user_id, 'testimony');
  return null;
end;
$$;

create trigger profile_details_invalidate
  after update on public.profile_details
  for each row when (old.testimony is distinct from new.testimony)
  execute function public.profile_details_invalidate();

create function public.user_skills_invalidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_ record := case when tg_op = 'DELETE' then old else new end;
begin
  -- Nothing to do while the whole account is going away.
  if not exists (select 1 from auth.users where id = row_.user_id)
     or not exists (select 1 from public.skills where id = row_.skill_id and category = 'spiritual') then
    return null;
  end if;
  update public.profile_details set spiritual_skills_updated_at = clock_timestamp() where user_id = row_.user_id;
  perform public.invalidate_verification(row_.user_id, 'spiritual_skills');
  return null;
end;
$$;

create trigger user_skills_invalidate
  after insert or delete on public.user_skills
  for each row execute function public.user_skills_invalidate();

-- ---------------------------------------------------------------------------
-- Writing skills and trainings: only the differences are applied
-- ---------------------------------------------------------------------------
create function public.set_user_skills(target uuid, category text, ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(ids, '{}'::uuid[]);
begin
  if not public.can_edit_profile(target) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if set_user_skills.category is null or set_user_skills.category not in ('manual', 'spiritual') then
    raise exception 'invalid_category';
  end if;
  -- Serialises with other saves and with a verification of the same profile.
  perform 1 from public.profile_details d where d.user_id = target for update;
  if not found then
    raise exception 'not_found';
  end if;
  -- An inactive skill can be kept, never added.
  if exists (
    select 1 from unnest(wanted) as w (id)
    where not exists (
      select 1 from public.skills s
      where s.id = w.id
        and s.category = set_user_skills.category
        and (s.active or exists (select 1 from public.user_skills us where us.user_id = target and us.skill_id = s.id))
    )
  ) then
    raise exception 'invalid_skill';
  end if;

  delete from public.user_skills us
  using public.skills s
  where us.user_id = target and us.skill_id = s.id
    and s.category = set_user_skills.category
    and us.skill_id <> all (wanted);

  insert into public.user_skills (user_id, skill_id)
  select distinct target, w.id from unnest(wanted) as w (id)
  on conflict do nothing;
end;
$$;

create function public.set_user_trainings(target uuid, ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(ids, '{}'::uuid[]);
begin
  if not public.can_edit_profile(target) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform 1 from public.profile_details d where d.user_id = target for update;
  if not found then
    raise exception 'not_found';
  end if;
  if exists (
    select 1 from unnest(wanted) as w (id)
    where not exists (
      select 1 from public.trainings t
      where t.id = w.id
        and (t.active or exists (select 1 from public.user_trainings ut where ut.user_id = target and ut.training_id = t.id))
    )
  ) then
    raise exception 'invalid_training';
  end if;

  delete from public.user_trainings ut where ut.user_id = target and ut.training_id <> all (wanted);
  insert into public.user_trainings (user_id, training_id)
  select distinct target, w.id from unnest(wanted) as w (id)
  on conflict do nothing;
end;
$$;

-- `seen_updated_at` is the content's date as the verifier read it (null when never written).
create function public.verify_profile(target uuid, subject text, verified boolean, seen_updated_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.profile_details;
  changed_at timestamptz;
  has_content boolean;
begin
  if not public.has_permission('profiles.verify') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'own_profile';
  end if;
  if verify_profile.subject is null or verify_profile.subject not in ('testimony', 'spiritual_skills') then
    raise exception 'invalid_subject';
  end if;
  select * into d from public.profile_details p where p.user_id = target for update;
  if not found then
    raise exception 'not_found';
  end if;

  if verify_profile.subject = 'testimony' then
    changed_at := d.testimony_updated_at;
    has_content := d.testimony <> '';
  else
    changed_at := d.spiritual_skills_updated_at;
    has_content := exists (
      select 1 from public.user_skills us
      join public.skills s on s.id = us.skill_id
      where us.user_id = target and s.category = 'spiritual'
    );
  end if;
  if changed_at is distinct from seen_updated_at then
    raise exception 'content_changed';
  end if;
  if verified and not has_content then
    raise exception 'empty_content';
  end if;

  perform public.invalidate_verification(target, verify_profile.subject);
  if verified then
    insert into public.profile_verifications (user_id, subject, verified_by)
    values (target, verify_profile.subject, (select auth.uid()));
  end if;
end;
$$;

revoke all on function
  public.set_user_skills(uuid, text, uuid[]),
  public.set_user_trainings(uuid, uuid[]),
  public.verify_profile(uuid, text, boolean, timestamptz)
from public, anon;
grant execute on function
  public.set_user_skills(uuid, text, uuid[]),
  public.set_user_trainings(uuid, uuid[]),
  public.verify_profile(uuid, text, boolean, timestamptz)
to authenticated;
