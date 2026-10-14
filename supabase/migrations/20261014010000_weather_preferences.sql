alter table public.couples
  add column if not exists weather_location_name text,
  add column if not exists weather_latitude double precision,
  add column if not exists weather_longitude double precision;

alter table public.couples
  drop constraint if exists couples_weather_coordinates_pair_check;

alter table public.couples
  add constraint couples_weather_coordinates_pair_check
  check (
    (weather_latitude is null and weather_longitude is null)
    or (
      weather_latitude is not null
      and weather_longitude is not null
      and weather_latitude between -90 and 90
      and weather_longitude between -180 and 180
    )
  );

alter table public.date_ideas
  add column if not exists weather_setting text not null default 'any';

alter table public.date_ideas
  drop constraint if exists date_ideas_weather_setting_check;

alter table public.date_ideas
  add constraint date_ideas_weather_setting_check
  check (weather_setting in ('any', 'indoor', 'outdoor'));

alter table public.date_idea_templates
  add column if not exists weather_setting text not null default 'any';

alter table public.date_idea_templates
  drop constraint if exists date_idea_templates_weather_setting_check;

alter table public.date_idea_templates
  add constraint date_idea_templates_weather_setting_check
  check (weather_setting in ('any', 'indoor', 'outdoor'));

update public.date_ideas
set weather_setting = 'indoor'
where at_home = true and weather_setting = 'any';

update public.date_idea_templates
set weather_setting = 'indoor'
where at_home = true and weather_setting = 'any';
