-- Flight searches start from the couple's own airport.
alter table public.couples
  add column home_airport text not null default 'OPO' check (home_airport ~ '^[A-Z]{3}$');
