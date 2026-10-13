alter table public.date_ideas
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180);

create table public.date_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  date_idea_id uuid not null references public.date_ideas(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index date_photos_couple_idea_idx on public.date_photos (couple_id, date_idea_id);

alter table public.date_photos enable row level security;
grant select, insert, delete on public.date_photos to authenticated;

create policy "Couples can read their own date photos"
  on public.date_photos for select
  using (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can add photos to their own dates"
  on public.date_photos for insert
  with check (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.date_ideas
      where id = date_idea_id and couple_id = date_photos.couple_id
    )
  );

create policy "Couples can remove photos from their own dates"
  on public.date_photos for delete
  using (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('date-photos', 'date-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Couples can read their own date photo files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'date-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can upload their own date photo files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'date-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can remove their own date photo files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'date-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.couples
      where account_user_id = (select auth.uid())
    )
  );
