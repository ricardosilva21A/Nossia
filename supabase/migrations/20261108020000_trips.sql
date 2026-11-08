-- Trips: places the couple wants to visit, trips with dates, and the plan for each trip.

create table public.couple_destinations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  city text not null check (length(trim(city)) between 1 and 120),
  country text not null default '',
  created_at timestamptz not null default now(),
  unique (couple_id, city)
);

create table public.couple_trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  destination_id uuid references public.couple_destinations(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 120),
  start_date date not null,
  end_date date not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index couple_trips_couple_dates_idx on public.couple_trips (couple_id, start_date);

-- day null means "to fit in somewhere".
create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.couple_trips(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  day date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index trip_items_trip_idx on public.trip_items (trip_id, day);

alter table public.couple_destinations enable row level security;
alter table public.couple_trips enable row level security;
alter table public.trip_items enable row level security;

grant select, insert, update, delete on public.couple_destinations, public.couple_trips, public.trip_items to authenticated;
grant select, insert, update, delete on public.couple_destinations, public.couple_trips, public.trip_items to service_role;

create policy "Members can read their destinations" on public.couple_destinations for select to authenticated using (public.is_couple_member(couple_id));
create policy "Members can add destinations" on public.couple_destinations for insert to authenticated with check (public.is_couple_member(couple_id));
create policy "Members can change destinations" on public.couple_destinations for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "Members can remove destinations" on public.couple_destinations for delete to authenticated using (public.is_couple_member(couple_id));

create policy "Members can read their trips" on public.couple_trips for select to authenticated using (public.is_couple_member(couple_id));
create policy "Members can add trips" on public.couple_trips for insert to authenticated with check (
  public.is_couple_member(couple_id)
  and (destination_id is null or exists (select 1 from public.couple_destinations where id = destination_id and couple_id = couple_trips.couple_id))
);
create policy "Members can change trips" on public.couple_trips for update to authenticated using (public.is_couple_member(couple_id)) with check (
  public.is_couple_member(couple_id)
  and (destination_id is null or exists (select 1 from public.couple_destinations where id = destination_id and couple_id = couple_trips.couple_id))
);
create policy "Members can remove trips" on public.couple_trips for delete to authenticated using (public.is_couple_member(couple_id));

create policy "Members can read their trip plans" on public.trip_items for select to authenticated using (public.is_couple_member(couple_id));
create policy "Members can add to trip plans" on public.trip_items for insert to authenticated with check (
  public.is_couple_member(couple_id)
  and exists (select 1 from public.couple_trips where id = trip_id and couple_id = trip_items.couple_id)
);
create policy "Members can change trip plans" on public.trip_items for update to authenticated using (public.is_couple_member(couple_id)) with check (
  public.is_couple_member(couple_id)
  and exists (select 1 from public.couple_trips where id = trip_id and couple_id = trip_items.couple_id)
);
create policy "Members can remove from trip plans" on public.trip_items for delete to authenticated using (public.is_couple_member(couple_id));

-- The same feed as before, plus the couple's trips.
create or replace function public.calendar_feed(feed_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed_member as (
    select member.couple_id, member.partner_slot
    from public.calendar_feeds as feed
    join public.couple_members as member on member.user_id = feed.user_id
    where feed.token = feed_token
  )
  select jsonb_build_object(
    'partner_slot', feed_member.partner_slot,
    'couple', (
      select jsonb_build_object(
        'id', couple.id,
        'partner_one_name', couple.partner_one_name,
        'partner_two_name', couple.partner_two_name,
        'partner_one_birth_date', couple.partner_one_birth_date,
        'partner_two_birth_date', couple.partner_two_birth_date,
        'relationship_date', couple.relationship_date
      )
      from public.couples as couple
      where couple.id = feed_member.couple_id
    ),
    'dates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', couple_date.id,
        'title', idea.title,
        'description', idea.description,
        'emoji', idea.emoji,
        'planned_for', couple_date.planned_for,
        'planned_start_time', couple_date.planned_start_time,
        'duration_minutes', idea.duration_minutes,
        'location_name', couple_date.location_name
      ) order by couple_date.planned_for)
      from public.couple_dates as couple_date
      join public.ideas as idea on idea.id = couple_date.idea_id
      where couple_date.couple_id = feed_member.couple_id
        and couple_date.status = 'planned'
        and couple_date.planned_for is not null
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', task.id,
        'title', task.title,
        'notes', task.notes,
        'due_date', task.due_date,
        'due_time', task.due_time,
        'assigned_to', task.assigned_to
      ) order by task.due_date)
      from public.couple_tasks as task
      where task.couple_id = feed_member.couple_id
        and task.done_at is null
        and task.due_date is not null
        and (task.assigned_to is null or task.assigned_to = feed_member.partner_slot)
    ), '[]'::jsonb),
    'commitments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', commitment.id,
        'title', commitment.title,
        'event_date', commitment.event_date,
        'starts_at', commitment.starts_at,
        'ends_at', commitment.ends_at,
        'for_partner', commitment.for_partner
      ) order by commitment.event_date)
      from public.couple_commitments as commitment
      where commitment.couple_id = feed_member.couple_id
        and (commitment.for_partner is null or commitment.for_partner = feed_member.partner_slot)
    ), '[]'::jsonb),
    'trips', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', trip.id,
        'title', trip.title,
        'start_date', trip.start_date,
        'end_date', trip.end_date
      ) order by trip.start_date)
      from public.couple_trips as trip
      where trip.couple_id = feed_member.couple_id
    ), '[]'::jsonb)
  )
  from feed_member;
$$;
