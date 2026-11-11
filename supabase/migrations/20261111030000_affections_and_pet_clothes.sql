-- Little signs of affection between the two (a kiss, a hug, a wave), and clothes for the animal.

create table if not exists public.couple_affections (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_slot text not null check (to_slot in ('partner_one', 'partner_two')),
  kind text not null check (kind in ('beijo', 'abraco', 'aceno', 'saudades', 'pensar')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  pushed_at timestamptz
);

create index if not exists couple_affections_inbox_idx on public.couple_affections (couple_id, to_slot, created_at desc);

alter table public.couple_affections enable row level security;
grant select, insert on public.couple_affections to authenticated;
grant update (seen_at) on public.couple_affections to authenticated;
grant select, insert, update, delete on public.couple_affections to service_role;

create policy "Members can see their affections" on public.couple_affections for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "Members send affection as themselves" on public.couple_affections for insert to authenticated
  with check (public.is_couple_member(couple_id) and from_user = (select auth.uid()));
-- Only the one who received it marks it as seen.
create policy "Recipients mark affection as seen" on public.couple_affections for update to authenticated
  using (exists (select 1 from public.couple_members m where m.couple_id = couple_affections.couple_id and m.user_id = (select auth.uid()) and m.partner_slot = couple_affections.to_slot))
  with check (exists (select 1 from public.couple_members m where m.couple_id = couple_affections.couple_id and m.user_id = (select auth.uid()) and m.partner_slot = couple_affections.to_slot));

create trigger couple_sync_touch after insert or update or delete on public.couple_affections
  for each row execute function public.touch_couple_sync('couple_id');

alter table public.notification_settings
  add column if not exists affection boolean not null default true;

alter table public.couple_pets
  add column if not exists accessory text not null default 'none'
  check (accessory in ('none', 'lenco', 'laco', 'chapeu', 'oculos', 'gorro'));
