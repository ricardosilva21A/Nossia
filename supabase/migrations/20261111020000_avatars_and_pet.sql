-- Each person gets a human avatar (a mini-them); the couple gets one animal that speaks for the house.
-- The avatar look is stored on the existing per-person row; ears/color/pattern there are no longer used.

alter table public.couple_mascots
  add column if not exists skin text check (skin is null or skin ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists hair text check (hair is null or hair in ('short', 'long', 'bun', 'curly', 'bald')),
  add column if not exists hair_color text check (hair_color is null or hair_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists glasses boolean not null default false,
  add column if not exists beard boolean not null default false;

-- One animal per couple: either partner can create it or rename it.
create table if not exists public.couple_pets (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  species text not null check (species in ('dog', 'cat', 'rabbit')),
  name text not null check (length(trim(name)) between 1 and 40),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  pattern text not null default 'none' check (pattern in ('none', 'spots', 'stripes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.couple_pets enable row level security;
grant select, insert, update on public.couple_pets to authenticated;
grant select, insert, update, delete on public.couple_pets to service_role;

create policy "Members can see their pet" on public.couple_pets for select to authenticated
  using (public.is_couple_member(couple_id));
create policy "Members can adopt their pet" on public.couple_pets for insert to authenticated
  with check (public.is_couple_member(couple_id));
create policy "Members can change their pet" on public.couple_pets for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create trigger couple_sync_touch after insert or update or delete on public.couple_pets
  for each row execute function public.touch_couple_sync('couple_id');
