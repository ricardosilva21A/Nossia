-- How each person takes holidays: whenever they like (with months to avoid), or on fixed company dates.
create table public.vacation_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  partner_slot text not null check (partner_slot in ('partner_one', 'partner_two')),
  mode text not null default 'flexible' check (mode in ('flexible', 'fixed')),
  days_per_year smallint check (days_per_year is null or days_per_year between 0 and 60),
  avoid_months smallint[] not null default '{}' check (avoid_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  updated_at timestamptz not null default now()
);

create table public.vacation_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  partner_slot text not null check (partner_slot in ('partner_one', 'partner_two')),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index vacation_profiles_couple_idx on public.vacation_profiles (couple_id);
create index vacation_periods_couple_idx on public.vacation_periods (couple_id, starts_on);
create index vacation_periods_user_idx on public.vacation_periods (user_id);

alter table public.vacation_profiles enable row level security;
alter table public.vacation_periods enable row level security;
grant select, insert, update, delete on public.vacation_profiles, public.vacation_periods to authenticated;
grant select, insert, update, delete on public.vacation_profiles, public.vacation_periods to service_role;

-- Both partners see each other's holidays, since planning them together is the point. Each edits only their own.
create policy "Members see their couple's holiday rules" on public.vacation_profiles for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "People set their own holiday rules" on public.vacation_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and partner_slot = public.my_partner_slot(couple_id));
create policy "People change their own holiday rules" on public.vacation_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and partner_slot = public.my_partner_slot(couple_id));

create policy "Members see their couple's holidays" on public.vacation_periods for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "People add their own holidays" on public.vacation_periods for insert to authenticated
  with check (user_id = (select auth.uid()) and partner_slot = public.my_partner_slot(couple_id));
create policy "People change their own holidays" on public.vacation_periods for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and partner_slot = public.my_partner_slot(couple_id));
create policy "People remove their own holidays" on public.vacation_periods for delete to authenticated
  using (user_id = (select auth.uid()));

create trigger couple_sync_touch after insert or update or delete on public.vacation_profiles for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.vacation_periods for each row execute function public.touch_couple_sync('couple_id');
