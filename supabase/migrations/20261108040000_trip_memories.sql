-- Trip memories: where each trip was on the map, a cover photo, notes and an album.

alter table public.couple_trips
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add column cover_photo_path text,
  add column memory text not null default '';

-- Files live in the date-photos bucket under the couple's folder, so its policies already apply.
create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  trip_id uuid not null references public.couple_trips(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index trip_photos_trip_idx on public.trip_photos (trip_id, created_at);

alter table public.trip_photos enable row level security;
grant select, insert, delete on public.trip_photos to authenticated;
grant select, insert, update, delete on public.trip_photos to service_role;

create policy "Members can read their trip photos" on public.trip_photos for select to authenticated using (public.is_couple_member(couple_id));
create policy "Members can add trip photos" on public.trip_photos for insert to authenticated with check (
  public.is_couple_member(couple_id)
  and exists (select 1 from public.couple_trips where id = trip_id and couple_id = trip_photos.couple_id)
);
create policy "Members can remove trip photos" on public.trip_photos for delete to authenticated using (public.is_couple_member(couple_id));
