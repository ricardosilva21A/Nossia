-- Push notifications: one subscription per device, each person's preferences, and a log so
-- the same reminder is never sent twice.

-- Lets the other partner be told when someone adds a date.
alter table public.couple_dates
  add column created_by uuid references auth.users(id) on delete set null default auth.uid();

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
grant select, delete on public.push_subscriptions to authenticated;

create policy "People can see their own devices"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "People can remove their own devices"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- A phone keeps its endpoint when someone else signs in on it, so saving moves it to them.
create function public.save_push_subscription(device_endpoint text, device_p256dh text, device_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'You need to be signed in.';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (device_endpoint, (select auth.uid()), device_p256dh, device_auth)
  on conflict (endpoint) do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

create table public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dates boolean not null default true,
  commitments boolean not null default true,
  nudges boolean not null default true,
  special_dates boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
grant select, insert, update on public.notification_settings to authenticated;

create policy "People can read their own notification settings"
  on public.notification_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "People can add their own notification settings"
  on public.notification_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "People can change their own notification settings"
  on public.notification_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the server reads and writes this.
create table public.notification_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.notification_log enable row level security;
