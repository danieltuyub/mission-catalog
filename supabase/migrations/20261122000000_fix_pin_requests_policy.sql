-- Fixes 20261120: the insert policy counted the user's pending requests with a subquery on
-- `pin_requests` itself, and Postgres refuses a policy that reads its own table
-- (42P17 "infinite recursion detected in policy"). The count moves into a security definer
-- function, which reads the table without going through the policies.

create function public.pending_pin_requests(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.pin_requests where requested_by = uid and status = 'pending';
$$;

revoke all on function public.pending_pin_requests(uuid) from public, anon;
grant execute on function public.pending_pin_requests(uuid) to authenticated;

drop policy "pin_requests: create" on public.pin_requests;

-- Requesters can only file their own, as pending, with at most 5 waiting for review.
create policy "pin_requests: create" on public.pin_requests
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'pending'
    and (select public.has_permission('pins.request'))
    and (select public.pending_pin_requests((select auth.uid()))) < 5
  );
