-- Tightening found in the audit. Nothing here changes what the app can do.

-- Admin checks read the session once per query instead of once per row.
alter policy "Admins add events" on public.events
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true');
alter policy "Admins edit events" on public.events
  using (((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true');
alter policy "Admins remove events" on public.events
  using (((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true');
alter policy "People see approved events" on public.events
  using (status = 'approved' or ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true');

alter policy "Couples add their own ideas and admins add public ones" on public.ideas
  with check ((created_by_couple_id is not null and public.is_couple_member(created_by_couple_id))
    or (created_by_couple_id is null and ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true'));
alter policy "Couples edit their own ideas and admins edit public ones" on public.ideas
  using ((created_by_couple_id is not null and public.is_couple_member(created_by_couple_id))
    or (created_by_couple_id is null and ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true'))
  with check ((created_by_couple_id is not null and public.is_couple_member(created_by_couple_id))
    or (created_by_couple_id is null and ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true'));
alter policy "Couples delete their own ideas and admins delete public ones" on public.ideas
  using ((created_by_couple_id is not null and public.is_couple_member(created_by_couple_id))
    or (created_by_couple_id is null and ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true'));

-- Foreign keys added this week, indexed.
create index if not exists couple_affections_from_user_idx on public.couple_affections (from_user);
create index if not exists couple_dates_proposed_by_idx on public.couple_dates (proposed_by);

-- Permissions nobody needs through the API.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.create_couple_for_new_account() from public, anon, authenticated;
