-- Totals for the admin page. Only numbers leave this function: no names, notes, photos or plans.
create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin'), '') <> 'true' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  with people as (
    select id, created_at, last_sign_in_at
    from auth.users
    where coalesce(raw_app_meta_data ->> 'catalog_admin', '') <> 'true'
  ),
  couples as (
    select c.id
    from public.couples c
    where c.account_user_id in (select id from people)
  ),
  dates as (
    select d.couple_id, d.status, d.created_at, d.completed_at
    from public.couple_dates d
    where d.couple_id in (select id from couples)
  ),
  weeks as (
    select generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as week
  )
  select jsonb_build_object(
    'accounts', (select count(*) from people),
    'accounts_last_7_days', (select count(*) from people where created_at > now() - interval '7 days'),
    'signed_in_last_30_days', (select count(*) from people where last_sign_in_at > now() - interval '30 days'),
    'couples', (select count(*) from couples),
    'couples_with_both', (select count(*) from couples c where (select count(*) from public.couple_members m where m.couple_id = c.id) >= 2),
    'active_couples_30_days', (select count(distinct couple_id) from dates where created_at > now() - interval '30 days' or completed_at > current_date - 30),
    'dates_planned', (select count(*) from dates where status = 'planned'),
    'dates_completed', (select count(*) from dates where status = 'completed'),
    'public_ideas', (select count(*) from public.ideas where created_by_couple_id is null),
    'couple_ideas', (select count(*) from public.ideas where created_by_couple_id in (select id from couples)),
    'signups_by_week', (
      select jsonb_agg(jsonb_build_object('week', to_char(w.week, 'YYYY-MM-DD'), 'count', (select count(*) from people p where p.created_at >= w.week and p.created_at < w.week + interval '1 week')) order by w.week)
      from weeks w
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- Deleting an account or a couple has to find every row pointing at it.
create index if not exists couple_commitments_created_by_idx on public.couple_commitments (created_by);
create index if not exists couple_dates_created_by_idx on public.couple_dates (created_by);
create index if not exists couple_idea_favorites_idea_idx on public.couple_idea_favorites (idea_id);
create index if not exists couple_invites_created_by_idx on public.couple_invites (created_by);
create index if not exists couple_invites_used_by_idx on public.couple_invites (used_by);
create index if not exists couple_tasks_created_by_idx on public.couple_tasks (created_by);
create index if not exists couple_trips_created_by_idx on public.couple_trips (created_by);
create index if not exists couple_trips_destination_idx on public.couple_trips (destination_id);
create index if not exists date_photos_date_idx on public.date_photos (date_id);
create index if not exists trip_items_couple_idx on public.trip_items (couple_id);
create index if not exists trip_photos_couple_idx on public.trip_photos (couple_id);
