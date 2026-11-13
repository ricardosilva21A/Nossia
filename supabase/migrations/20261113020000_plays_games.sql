-- Whether this person plays on the computer: the house shows them at the desk now and then.
alter table public.couple_mascots
  add column if not exists plays_games boolean not null default false;
