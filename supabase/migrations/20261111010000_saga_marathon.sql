-- A film night with a pretext. "Ver um filme ou uma série" stays only to file what couples log
-- they watched; the app no longer suggests it.
insert into public.ideas (title, description, category, duration, budget, emoji, mood, duration_minutes, budget_eur, travel_minutes, at_home, weather_setting, repeatable, tags, activity, special)
select 'Maratona de uma saga',
       'Escolham uma saga (Harry Potter, Senhor dos Anéis, Star Wars…), preparem pipocas e uma manta, e vejam vários filmes seguidos.',
       'Culture', '4+ h', 'Grátis', '🎬', 'Relaxing', 360, 0, 0, true, 'indoor', true, array['cinema'], 'ver', false
where not exists (
  select 1 from public.ideas where created_by_couple_id is null and title = 'Maratona de uma saga'
);
