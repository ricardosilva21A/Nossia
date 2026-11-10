-- Real events near the couple, added by hand in the admin for now.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 2000),
  starts_on date not null,
  ends_on date not null,
  start_time time,
  venue text not null default '' check (length(venue) <= 200),
  municipality text not null default '' check (length(municipality) <= 80),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  category text not null default 'Culture' check (category in ('Romantic', 'Adventure', 'Food & drink', 'Creative', 'Relaxing', 'Culture')),
  price_for_two numeric check (price_for_two is null or price_for_two >= 0),
  indoor boolean not null default false,
  url text check (url is null or url ~ '^https?://'),
  image_url text check (image_url is null or image_url ~ '^https?://'),
  tags text[] not null default '{}',
  featured boolean not null default false,
  -- How far people would travel for it: local events show nearby, big ones further away.
  reach text not null default 'local' check (reach in ('local', 'regional', 'national')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index events_upcoming_idx on public.events (ends_on) where status = 'approved';

alter table public.events enable row level security;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.events to service_role;

create policy "People see approved events" on public.events for select to authenticated
  using (status = 'approved' or (select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');
create policy "Admins add events" on public.events for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');
create policy "Admins edit events" on public.events for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');
create policy "Admins remove events" on public.events for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');

-- Where the couple lives, so events can be measured from there.
alter table public.couples
  add column municipality text check (municipality is null or length(municipality) <= 80),
  add column municipality_latitude double precision check (municipality_latitude between -90 and 90),
  add column municipality_longitude double precision check (municipality_longitude between -180 and 180);

-- A date booked from an event keeps the link to it.
alter table public.couple_dates
  add column event_id uuid references public.events(id) on delete set null;

create index couple_dates_event_idx on public.couple_dates (event_id) where event_id is not null;
