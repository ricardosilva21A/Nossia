alter table public.date_ideas
  add column mood text not null default 'Surprise me'
    check (mood in ('Romantic', 'Fun', 'Relaxing', 'Adventure', 'Creative', 'Surprise me')),
  add column duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  add column budget_eur numeric(8, 2) check (budget_eur is null or budget_eur >= 0),
  add column travel_minutes smallint check (travel_minutes is null or travel_minutes >= 0),
  add column at_home boolean not null default false;

update public.date_ideas
set mood = case category
  when 'Romantic' then 'Romantic'
  when 'Adventure' then 'Adventure'
  when 'Relaxing' then 'Relaxing'
  when 'Creative' then 'Creative'
  when 'Food & drink' then 'Fun'
  when 'Culture' then 'Fun'
  else 'Surprise me'
end,
duration_minutes = case
  when duration ~* 'hour' and duration ~ '^[0-9]+' then (substring(duration from '^[0-9]+'))::integer * 60
  when duration ~* 'minute' and duration ~ '^[0-9]+' then (substring(duration from '^[0-9]+'))::integer
  else null
end,
budget_eur = case
  when lower(budget) in ('free', 'gratuito') then 0
  when budget = '€' then 10
  when budget = '€€' then 30
  when budget = '€€€' then 60
  when budget ~ '^[0-9]+([.][0-9]+)?$' then budget::numeric
  else null
end,
at_home = title ilike '%breakfast in bed%'
  or title ilike '%games night%'
  or title ilike '%cook something new%';
