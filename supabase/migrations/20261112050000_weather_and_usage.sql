-- Weather notifications get their own switch; usage is counted anonymously.

alter table public.notification_settings
  add column if not exists weather boolean not null default true;

-- What gets used in the app, by name only: no account, no couple, no content. A random id per
-- device (not tied to the account) lets us count devices without knowing whose they are.
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z0-9_:]{1,60}$'),
  device text not null check (length(device) between 8 and 64),
  created_at timestamptz not null default now()
);

create index if not exists app_events_created_idx on public.app_events (created_at desc);

alter table public.app_events enable row level security;
grant insert on public.app_events to authenticated;
grant usage on sequence public.app_events_id_seq to authenticated;
grant select, insert, delete on public.app_events to service_role;

create policy "Signed-in people can record usage" on public.app_events for insert to authenticated
  with check (true);

-- Admins read totals, never single rows.
create or replace function public.usage_overview(days integer default 30)
returns table (name text, uses bigint, devices bigint, last_used timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.name, count(*), count(distinct e.device), max(e.created_at)
  from public.app_events e
  where e.created_at >= now() - make_interval(days => greatest(1, least(days, 365)))
    and ((select auth.jwt()) -> 'app_metadata' ->> 'catalog_admin') = 'true'
  group by e.name
  order by count(*) desc;
$$;

revoke all on function public.usage_overview(integer) from public, anon;
grant execute on function public.usage_overview(integer) to authenticated;
