create table public.couples (
  id uuid primary key default gen_random_uuid(),
  account_user_id uuid not null unique references auth.users(id) on delete cascade,
  partner_one_name text not null,
  partner_two_name text not null,
  partner_one_birth_date date,
  partner_two_birth_date date,
  relationship_date date not null,
  first_met_date date,
  first_message_date date,
  first_date_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  duration text not null default 'To decide',
  budget text not null default 'To decide',
  emoji text not null default '💌',
  status text not null default 'idea' check (status in ('idea', 'planned', 'completed')),
  favorite boolean not null default false,
  planned_for date,
  completed_at date,
  memory text,
  rating smallint check (rating between 1 and 5),
  location_name text,
  created_at timestamptz not null default now()
);

create index date_ideas_couple_status_idx on public.date_ideas (couple_id, status);
create index date_ideas_couple_planned_idx on public.date_ideas (couple_id, planned_for);

alter table public.couples enable row level security;
alter table public.date_ideas enable row level security;

grant select, update on public.couples to authenticated;
grant select, insert, update, delete on public.date_ideas to authenticated;

create policy "Couples can read their own profile"
  on public.couples for select
  using (account_user_id = (select auth.uid()));

create policy "Couples can update their own profile"
  on public.couples for update
  using (account_user_id = (select auth.uid()))
  with check (account_user_id = (select auth.uid()));

create policy "Couples can read their own date ideas"
  on public.date_ideas for select
  using (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can create their own date ideas"
  on public.date_ideas for insert
  with check (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can update their own date ideas"
  on public.date_ideas for update
  using (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  )
  with check (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create policy "Couples can delete their own date ideas"
  on public.date_ideas for delete
  using (
    couple_id in (
      select id from public.couples
      where account_user_id = (select auth.uid())
    )
  );

create function public.create_couple_for_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.couples (
    account_user_id,
    partner_one_name,
    partner_two_name,
    partner_one_birth_date,
    partner_two_birth_date,
    relationship_date,
    first_met_date,
    first_message_date,
    first_date_date
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'partner_one_name', ''), 'Partner 1'),
    coalesce(nullif(new.raw_user_meta_data ->> 'partner_two_name', ''), 'Partner 2'),
    nullif(new.raw_user_meta_data ->> 'partner_one_birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'partner_two_birth_date', '')::date,
    (new.raw_user_meta_data ->> 'relationship_date')::date,
    nullif(new.raw_user_meta_data ->> 'first_met_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'first_message_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'first_date_date', '')::date
  );
  return new;
end;
$$;

create trigger on_auth_user_created_create_couple
  after insert on auth.users
  for each row execute procedure public.create_couple_for_new_account();
