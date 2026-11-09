-- One mascot per person. Only what they chose is stored; the drawings live in the app.
create table public.couple_mascots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  partner_slot text not null check (partner_slot in ('partner_one', 'partner_two')),
  name text not null check (length(trim(name)) between 1 and 40),
  ears text not null check (ears in ('round', 'cat', 'dog', 'rabbit')),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  pattern text not null check (pattern in ('none', 'spots', 'stripes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, partner_slot)
);

alter table public.couple_mascots enable row level security;
grant select, insert, update on public.couple_mascots to authenticated;
grant select, insert, update, delete on public.couple_mascots to service_role;

create policy "Members can see their couple's mascots" on public.couple_mascots for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "People create their own mascot" on public.couple_mascots for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id) and partner_slot = public.my_partner_slot(couple_id));
create policy "People edit their own mascot" on public.couple_mascots for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id) and partner_slot = public.my_partner_slot(couple_id));
