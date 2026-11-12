-- Distinct values for the projects filter form, in a single round trip.
-- security invoker: RLS of public.projects applies to the caller.
create or replace function public.project_filter_options()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'country',
      coalesce(jsonb_agg(distinct country) filter (where country is not null and country <> ''), '[]'::jsonb),
    'region',
      coalesce(jsonb_agg(distinct region) filter (where region is not null and region <> ''), '[]'::jsonb),
    'responsible',
      coalesce(jsonb_agg(distinct responsible) filter (where responsible is not null and responsible <> ''), '[]'::jsonb)
  )
  from public.projects;
$$;

grant execute on function public.project_filter_options() to anon;
