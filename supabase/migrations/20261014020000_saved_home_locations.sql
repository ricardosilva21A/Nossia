alter table public.date_ideas
  add column if not exists home_partner text;

alter table public.date_ideas
  drop constraint if exists date_ideas_home_partner_check;

alter table public.date_ideas
  add constraint date_ideas_home_partner_check
  check (home_partner is null or home_partner in ('partner_one', 'partner_two'));
