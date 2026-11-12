-- A date one of them marks is a proposal until the other accepts it (or moves it to another day).
-- Dates that already exist stay confirmed.
alter table public.couple_dates
  add column if not exists proposal text not null default 'confirmed' check (proposal in ('proposed', 'confirmed')),
  add column if not exists proposed_by uuid references auth.users(id) on delete set null;
