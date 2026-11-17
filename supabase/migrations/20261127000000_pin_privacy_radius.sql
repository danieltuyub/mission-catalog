-- The map now draws a 1 km circle (it was 2 km) around the selected pin, and the real place must always be
-- inside it: pins are moved 300-900 m (it was 300 m - 1.5 km).
-- Needs 20261126 (pin_location_privacy).

create or replace function public.fuzz_location(in_lat float8, in_lng float8)
returns table (lat float8, lng float8)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  metres float8 := 300 + random() * 600;
  bearing float8 := random() * 2 * pi();
begin
  lat := greatest(least(in_lat + metres * cos(bearing) / 111320.0, 90), -90);
  lng := (mod((in_lng + metres * sin(bearing) / (111320.0 * greatest(cos(radians(in_lat)), 0.01)) + 540)::numeric, 360) - 180)::float8;
  return next;
end;
$$;

revoke all on function public.fuzz_location(float8, float8) from public, anon, authenticated;

-- Pins already moved more than 900 m would fall outside the circle: move them again, once.
-- (The update trigger keeps places fixed on purpose; it is off for this statement only.)
alter table public.pins disable trigger pins_hide_location;

do $$
declare
  r record;
  f record;
begin
  for r in
    select id, exact_lat, exact_lng
    from public.pins
    where sqrt(power((lat - exact_lat) * 111320.0, 2) + power((lng - exact_lng) * 111320.0 * cos(radians(exact_lat)), 2)) > 900
  loop
    select * into f from public.fuzz_location(r.exact_lat, r.exact_lng);
    update public.pins set lat = f.lat, lng = f.lng where id = r.id;
  end loop;
end;
$$;

alter table public.pins enable trigger pins_hide_location;
