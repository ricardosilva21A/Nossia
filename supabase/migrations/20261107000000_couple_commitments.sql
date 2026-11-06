-- Commitments: things in the couple's week that aren't dates, like "jantar em casa da mãe"
-- or the dentist. They reach the calendar feed and count as busy time.

-- for_partner null means the commitment is for both.
create table public.couple_commitments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  event_date date not null,
  starts_at time,
  ends_at time,
  for_partner text check (for_partner is null or for_partner in ('partner_one', 'partner_two')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_at is null or (starts_at is not null and ends_at > starts_at))
);

create index couple_commitments_couple_date_idx on public.couple_commitments (couple_id, event_date);

alter table public.couple_commitments enable row level security;
grant select, insert, update, delete on public.couple_commitments to authenticated;

create policy "Members can read their commitments"
  on public.couple_commitments for select
  to authenticated
  using (public.is_couple_member(couple_id));

create policy "Members can add commitments"
  on public.couple_commitments for insert
  to authenticated
  with check (public.is_couple_member(couple_id));

create policy "Members can change commitments"
  on public.couple_commitments for update
  to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "Members can remove commitments"
  on public.couple_commitments for delete
  to authenticated
  using (public.is_couple_member(couple_id));

-- The same feed as before, plus this partner's commitments and the ones for both.
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
    ), '[]'::jsonb)
  )
  from feed_member;
$$;
