-- Secret gift ideas: each person keeps their own list for the other one. Nobody else can read it,
-- not even the partner, so there is no sync trigger either.
create table if not exists public.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  url text check (url is null or (url ~ '^https?://' and length(url) <= 2048)),
  note text not null default '' check (length(note) <= 1000),
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gift_ideas_owner_idx on public.gift_ideas (owner, created_at desc);
create index if not exists gift_ideas_couple_idx on public.gift_ideas (couple_id);

alter table public.gift_ideas enable row level security;
grant select, insert, update, delete on public.gift_ideas to authenticated;
grant select, insert, update, delete on public.gift_ideas to service_role;

create policy "People see only their own gift ideas" on public.gift_ideas for select to authenticated
  using (owner = (select auth.uid()) and public.is_couple_member(couple_id));
create policy "People add their own gift ideas" on public.gift_ideas for insert to authenticated
  with check (owner = (select auth.uid()) and public.is_couple_member(couple_id));
create policy "People change their own gift ideas" on public.gift_ideas for update to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and public.is_couple_member(couple_id));
create policy "People remove their own gift ideas" on public.gift_ideas for delete to authenticated
  using (owner = (select auth.uid()));
