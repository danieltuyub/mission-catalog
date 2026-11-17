-- Location privacy: the exact place of a pin is private; everyone reads an approximate one.
--
--   exact_lat / exact_lng   where the pin really is. Not readable by anon or authenticated; admins read
--                           it through `admin_pin_locations()`.
--   lat / lng               a point 300 m - 1.5 km away in a random direction, chosen ONCE when the pin is
--                           created (never recomputed: repeated reads cannot be averaged into the real spot).
--                           The map draws a 2 km circle around it, so the real place is always inside.
--
-- Clients keep sending the exact place as `lat`/`lng` when creating a pin: the trigger does the swap.
-- IMPORTANT: `select *` on pins now fails (the exact columns are off limits): select columns explicitly.

alter table public.pins
  add column exact_lat float8,
  add column exact_lng float8;

-- A random point 300 m - 1.5 km away. Only the trigger and this migration call it.
create function public.fuzz_location(in_lat float8, in_lng float8)
returns table (lat float8, lng float8)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  metres float8 := 300 + random() * 1200;
  bearing float8 := random() * 2 * pi();
begin
  lat := greatest(least(in_lat + metres * cos(bearing) / 111320.0, 90), -90);
  -- A degree of longitude is shorter away from the equator; keep the division safe near the poles.
  lng := (mod((in_lng + metres * sin(bearing) / (111320.0 * greatest(cos(radians(in_lat)), 0.01)) + 540)::numeric, 360) - 180)::float8;
  return next;
end;
$$;

revoke all on function public.fuzz_location(float8, float8) from public, anon, authenticated;

-- Existing pins: keep the real place private and publish the approximate one.
do $$
declare
  r record;
  f record;
begin
  for r in select id, lat, lng from public.pins where exact_lat is null loop
    select * into f from public.fuzz_location(r.lat, r.lng);
    update public.pins
    set exact_lat = r.lat, exact_lng = r.lng, lat = f.lat, lng = f.lng
    where id = r.id;
  end loop;
end;
$$;

alter table public.pins
  alter column exact_lat set not null,
  alter column exact_lng set not null;

create function public.pins_hide_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.exact_lat := new.lat;
    new.exact_lng := new.lng;
    select f.lat, f.lng into new.lat, new.lng from public.fuzz_location(new.exact_lat, new.exact_lng) f;
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

create trigger pins_hide_location
  before insert or update on public.pins
  for each row execute function public.pins_hide_location();

-- Everyone (and admins too, through the API) reads only these columns.
revoke select on public.pins from anon, authenticated;
grant select (id, title, description, lat, lng, created_at, image_path, country, region, city, languages, kind)
  on public.pins to anon, authenticated;

-- The exact places, for admins.
create function public.admin_pin_locations()
returns table (pin_id uuid, lat float8, lng float8)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('pins.write') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select p.id, p.exact_lat, p.exact_lng from public.pins p;
end;
$$;

revoke all on function public.admin_pin_locations() from public, anon;
grant execute on function public.admin_pin_locations() to authenticated;
