-- Where a pin is: country, region (state) and city, written by whoever proposes it and corrected
-- by the admin who reviews it. Existing pins and requests keep empty values (shown as "Sin país").
-- No external geocoding: the people who know the place say where it is.
alter table public.pins
  add column country text not null default '' check (char_length(country) <= 100),
  add column region text not null default '' check (char_length(region) <= 100),
  add column city text not null default '' check (char_length(city) <= 100);

alter table public.pin_requests
  add column country text not null default '' check (char_length(country) <= 100),
  add column region text not null default '' check (char_length(region) <= 100),
  add column city text not null default '' check (char_length(city) <= 100);

-- Filtering the admin list by country.
create index pins_country_idx on public.pins (country);
