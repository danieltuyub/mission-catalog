-- The user's own pin. Asked through `pin_requests`, authorized with `profiles.authorize_pin`, and public
-- only while: opted in, testimony verified, authorized (the pin exists) and account not blocked.
-- Its content follows the profile, so nobody edits it directly (`pins.write` may only delete it).
-- Needs 20261204 (profile details and verifications).

alter table public.pins
  add column profile_user_id uuid unique references auth.users (id) on delete cascade;

alter table public.pin_requests
  add column profile_user_id uuid references auth.users (id) on delete cascade,
  add constraint pin_requests_profile_no_image check (profile_user_id is null or image_path is null);

create unique index pin_requests_profile_pending_idx
  on public.pin_requests (profile_user_id) where status = 'pending' and profile_user_id is not null;

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
create function public.profile_pin_visible(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.profile_details d
      join public.profile_verifications v
        on v.user_id = d.user_id and v.subject = 'testimony' and v.invalidated_at is null
      where d.user_id = uid and d.show_on_map
    )
    and not public.is_banned(uid);
$$;

revoke all on function public.profile_pin_visible(uuid) from public;
grant execute on function public.profile_pin_visible(uuid) to anon, authenticated;

-- Hidden ones are listed for administrators by `admin_profile_pins()`, so the map query stays the same.
drop policy "public read" on public.pins;
create policy "public read" on public.pins
  for select to anon, authenticated
  using (profile_user_id is null or public.profile_pin_visible(profile_user_id));

-- ---------------------------------------------------------------------------
-- Direct writes: refused for profile pins. The functions below run as their owner, so they pass.
-- ---------------------------------------------------------------------------
create function public.is_profile_pin(p_pin uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pins where id = p_pin and profile_user_id is not null);
$$;

revoke all on function public.is_profile_pin(uuid) from public, anon;
grant execute on function public.is_profile_pin(uuid) to authenticated;

-- Not security definer: `current_user` must be the caller's.
create function public.pins_guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  touches boolean := new.profile_user_id is not null;
begin
  if tg_op = 'UPDATE' then
    touches := touches or old.profile_user_id is not null;
  end if;
  if touches and current_user in ('anon', 'authenticated') then
    raise exception 'profile_pin_readonly' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger pins_guard_profile
  before insert or update on public.pins
  for each row execute function public.pins_guard_profile();

create function public.pin_contacts_guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pin uuid;
begin
  if tg_op = 'DELETE' then
    pin := old.pin_id;
  else
    pin := new.pin_id;
  end if;
  if current_user in ('anon', 'authenticated') and public.is_profile_pin(pin) then
    raise exception 'profile_pin_readonly' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger pin_contacts_guard_profile
  before insert or update or delete on public.pin_contacts
  for each row execute function public.pin_contacts_guard_profile();

-- A profile pin can move (after a new authorization). The published point changes only when the new
-- place would fall more than 900 m from it, so the real place stays inside the circle on the map.
create or replace function public.pins_hide_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  north float8;
  east float8;
begin
  if tg_op = 'INSERT' then
    new.exact_lat := new.lat;
    new.exact_lng := new.lng;
    select f.lat, f.lng into new.lat, new.lng from public.fuzz_location(new.exact_lat, new.exact_lng) f;
  elsif old.profile_user_id is not null
    and (new.exact_lat is distinct from old.exact_lat or new.exact_lng is distinct from old.exact_lng) then
    north := (new.exact_lat - old.lat) * 111320.0;
    east := (mod((new.exact_lng - old.lng + 540)::numeric, 360) - 180)::float8 * 111320.0 * cos(radians(new.exact_lat));
    if sqrt(north * north + east * east) > 900 then
      select f.lat, f.lng into new.lat, new.lng from public.fuzz_location(new.exact_lat, new.exact_lng) f;
    else
      new.lat := old.lat;
      new.lng := old.lng;
    end if;
  else
    -- The place is chosen once, on the map: updates never move it (nor reveal it).
    new.lat := old.lat;
    new.lng := old.lng;
    new.exact_lat := old.exact_lat;
    new.exact_lng := old.exact_lng;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------
drop policy "pin_requests: read" on public.pin_requests;
create policy "pin_requests: read" on public.pin_requests
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or profile_user_id = (select auth.uid())
    or (profile_user_id is null and (select public.has_permission('pins.approve')))
    or (profile_user_id is not null and (select public.has_permission('profiles.authorize_pin')))
  );

-- Profile requests are filed and reviewed through functions only.
drop policy "pin_requests: create" on public.pin_requests;
create policy "pin_requests: create" on public.pin_requests
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and profile_user_id is null
    and status = 'pending'
    and (select public.has_permission('pins.request'))
    and (select public.pending_pin_requests((select auth.uid()))) < 5
  );

drop policy "pin_requests: review" on public.pin_requests;
create policy "pin_requests: review" on public.pin_requests
  for update to authenticated
  using (profile_user_id is null and (select public.has_permission('pins.approve')))
  with check (profile_user_id is null and (select public.has_permission('pins.approve')));

create or replace function public.pending_pin_requests(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.pin_requests
  where requested_by = uid and status = 'pending' and profile_user_id is null;
$$;

-- Files the profile pin request, or replaces the one still waiting. Returns its id.
create function public.submit_profile_pin(
  target uuid,
  lat float8,
  lng float8,
  country text,
  region text,
  city text,
  languages text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.profile_details;
  name_ text;
  request uuid;
begin
  if not public.can_edit_profile(target) or not public.has_permission('pins.request') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into d from public.profile_details p where p.user_id = target for update;
  if not found then
    raise exception 'not_found';
  end if;
  select left(btrim(p.first_name), 200) into name_ from public.profiles p where p.user_id = target;
  if coalesce(name_, '') = '' then
    raise exception 'first_name_required';
  end if;

  update public.pin_requests r
  set requested_by = (select auth.uid()),
      title = name_,
      lat = submit_profile_pin.lat,
      lng = submit_profile_pin.lng,
      country = coalesce(submit_profile_pin.country, ''),
      region = coalesce(submit_profile_pin.region, ''),
      city = coalesce(submit_profile_pin.city, ''),
      languages = coalesce(submit_profile_pin.languages, '{}'::text[]),
      kind = d.household,
      created_at = clock_timestamp()
  where r.profile_user_id = target and r.status = 'pending'
  returning r.id into request;

  if request is null then
    insert into public.pin_requests
      (requested_by, profile_user_id, title, lat, lng, country, region, city, languages, kind, created_at)
    values (
      (select auth.uid()), target, name_, submit_profile_pin.lat, submit_profile_pin.lng,
      coalesce(submit_profile_pin.country, ''), coalesce(submit_profile_pin.region, ''),
      coalesce(submit_profile_pin.city, ''), coalesce(submit_profile_pin.languages, '{}'::text[]),
      d.household, clock_timestamp()
    )
    returning id into request;
  end if;
  return request;
end;
$$;

-- `seen_at` is the request's `created_at` as the reviewer read it (a replacement moves it).
create function public.review_profile_pin(request_id uuid, approve boolean, seen_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.pin_requests;
  name_ text;
  text_ text;
  household_ text;
  pin uuid;
begin
  if not public.has_permission('profiles.authorize_pin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into req from public.pin_requests r
  where r.id = request_id and r.profile_user_id is not null
  for update;
  if not found then
    raise exception 'not_found';
  end if;
  if req.status <> 'pending' then
    raise exception 'already_reviewed';
  end if;
  if req.profile_user_id = (select auth.uid()) then
    raise exception 'own_pin';
  end if;
  if req.created_at is distinct from seen_at then
    raise exception 'content_changed';
  end if;

  if approve then
    select d.household,
           case when exists (
             select 1 from public.profile_verifications v
             where v.user_id = d.user_id and v.subject = 'testimony' and v.invalidated_at is null
           ) then d.testimony else '' end
    into household_, text_
    from public.profile_details d
    where d.user_id = req.profile_user_id
    for update;
    select coalesce(nullif(left(btrim(p.first_name), 200), ''), req.title) into name_
    from public.profiles p where p.user_id = req.profile_user_id;

    select id into pin from public.pins where profile_user_id = req.profile_user_id for update;
    if pin is null then
      insert into public.pins
        (title, description, lat, lng, country, region, city, languages, kind, profile_user_id)
      values
        (name_, text_, req.lat, req.lng, req.country, req.region, req.city, req.languages, household_, req.profile_user_id)
      returning id into pin;
    else
      -- The same pin, so its conversations stay.
      update public.pins
      set title = name_, description = text_, exact_lat = req.lat, exact_lng = req.lng,
          country = req.country, region = req.region, city = req.city, languages = req.languages, kind = household_
      where id = pin;
    end if;

    insert into public.pin_contacts (pin_id, user_id) values (pin, req.profile_user_id)
    on conflict (pin_id) do update set user_id = excluded.user_id;
  end if;

  update public.pin_requests set status = case when approve then 'approved' else 'rejected' end where id = request_id;
end;
$$;

-- For the profile screen: whether the pin was authorized and whether the public sees it now.
create function public.profile_pin_state(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  authorized boolean;
begin
  if not public.can_read_profile(target) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  authorized := exists (select 1 from public.pins where profile_user_id = target);
  return jsonb_build_object('authorized', authorized, 'visible', authorized and public.profile_pin_visible(target));
end;
$$;

-- Every profile pin, hidden ones included, for administration.
create function public.admin_profile_pins()
returns table (
  pin_id uuid,
  user_id uuid,
  title text,
  description text,
  country text,
  region text,
  city text,
  languages text[],
  kind text,
  lat float8,
  lng float8,
  exact_lat float8,
  exact_lng float8,
  visible boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_permission('pins.write') or public.has_permission('profiles.authorize_pin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select p.id, p.profile_user_id, p.title, p.description, p.country, p.region, p.city, p.languages, p.kind,
         p.lat, p.lng, p.exact_lat, p.exact_lng, public.profile_pin_visible(p.profile_user_id)
  from public.pins p
  where p.profile_user_id is not null
  order by p.created_at desc;
end;
$$;

-- A hidden pin is out of reach of a plain delete (row level security does not show it).
create function public.admin_delete_profile_pin(p_pin uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('pins.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.pins where id = p_pin and profile_user_id is not null;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function
  public.admin_delete_profile_pin(uuid),
  public.submit_profile_pin(uuid, float8, float8, text, text, text, text[]),
  public.review_profile_pin(uuid, boolean, timestamptz),
  public.profile_pin_state(uuid),
  public.admin_profile_pins()
from public, anon;
grant execute on function
  public.admin_delete_profile_pin(uuid),
  public.submit_profile_pin(uuid, float8, float8, text, text, text, text[]),
  public.review_profile_pin(uuid, boolean, timestamptz),
  public.profile_pin_state(uuid),
  public.admin_profile_pins()
to authenticated;

-- ---------------------------------------------------------------------------
-- The pin follows the profile
-- ---------------------------------------------------------------------------
create function public.profile_pin_sync_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An emptied name keeps the last one: a pin is never published without it.
  if btrim(new.first_name) <> '' then
    update public.pins set title = left(btrim(new.first_name), 200) where profile_user_id = new.user_id;
  end if;
  return null;
end;
$$;

create trigger profile_pin_sync_name
  after update on public.profiles
  for each row when (old.first_name is distinct from new.first_name)
  execute function public.profile_pin_sync_name();

create function public.profile_pin_sync_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pins set kind = new.household where profile_user_id = new.user_id;
  return null;
end;
$$;

create trigger profile_pin_sync_household
  after update on public.profile_details
  for each row when (old.household is distinct from new.household)
  execute function public.profile_pin_sync_household();

-- Only verified text is ever copied to the pin.
create function public.profile_pin_sync_testimony()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pins p
  set description = d.testimony
  from public.profile_details d
  where d.user_id = new.user_id and p.profile_user_id = new.user_id;
  return null;
end;
$$;

create trigger profile_pin_sync_testimony
  after insert on public.profile_verifications
  for each row when (new.subject = 'testimony')
  execute function public.profile_pin_sync_testimony();

-- ---------------------------------------------------------------------------
-- A hidden profile pin opens no new conversation; the existing ones go on.
-- ---------------------------------------------------------------------------
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
  conv uuid;
begin
  new.sender_id := auth.uid();
  if new.recipient_id is null and new.pin_id is not null then
    -- Written from a pin: it goes to its contact (null when there is none, so the insert fails).
    select user_id into new.recipient_id from public.pin_contacts where pin_id = new.pin_id;
  elsif new.recipient_id is null and new.project_id is not null then
    -- Written from a project page: it goes to whoever created that project.
    select created_by into new.recipient_id from public.projects where id = new.project_id;
  end if;
  select btrim(first_name || ' ' || last_name) into new.sender_name
  from public.profiles where user_id = new.sender_id;
  new.sender_name := coalesce(new.sender_name, '');

  if new.sender_id is not null and new.recipient_id is not null and new.sender_id <> new.recipient_id then
    a := least(new.sender_id, new.recipient_id);
    b := greatest(new.sender_id, new.recipient_id);
    -- Two simultaneous first messages of a pair must not open two conversations.
    perform pg_advisory_xact_lock(
      hashtextextended(a::text || b::text || coalesce(new.project_id::text, '') || coalesce(new.pin_id::text, ''), 0)
    );

    select id into conv
    from public.conversations
    where user_a = a and user_b = b
      and project_id is not distinct from new.project_id
      and pin_id is not distinct from new.pin_id
    order by created_at
    limit 1;

    if conv is null then
      if exists (
        select 1 from public.pins p
        where p.id = new.pin_id and p.profile_user_id is not null
          and not public.profile_pin_visible(p.profile_user_id)
      ) then
        raise exception 'pin_unavailable' using errcode = '42501';
      end if;
      insert into public.conversations (user_a, user_b, project_id, pin_id)
      values (a, b, new.project_id, new.pin_id)
      returning id into conv;
    else
      update public.conversations set last_message_at = now() where id = conv;
    end if;
    new.conversation_id := conv;
  end if;
  return new;
end;
$$;
