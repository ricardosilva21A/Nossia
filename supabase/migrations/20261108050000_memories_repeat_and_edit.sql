-- What a date was, in words the couple will want later: what they watched, what they ate, and
-- whether they'd do it again. Ideas can be repeatable, and places get a verdict.

alter table public.couple_dates
  add column would_repeat boolean,
  add column watched_title text check (watched_title is null or length(watched_title) <= 200),
  add column food_notes text check (food_notes is null or length(food_notes) <= 1000);

create index couple_dates_watched_idx on public.couple_dates (couple_id, watched_title) where watched_title is not null;

-- Repeatable ideas stay in the list after being done, like watching something together.
alter table public.ideas
  add column repeatable boolean not null default false;

insert into public.ideas (title, description, category, duration, budget, emoji, mood, duration_minutes, budget_eur, travel_minutes, at_home, weather_setting, repeatable)
values ('Ver um filme ou uma série', 'Escolham o que querem ver, façam pipocas e fiquem no sofá.', 'Culture', '2 h', 'Grátis', '🍿', 'Relaxing', 120, 0, 0, true, 'indoor', true)
on conflict (created_by_couple_id, title, description) do update set repeatable = true;

update public.ideas
set repeatable = true
where created_by_couple_id is null
  and title in (
    'Ver um filme escolhido à vez', 'Maratona de comédia', 'Noite de documentário', 'Noite de cinema por tema',
    'Maratona de filmes de Natal', 'Noite de filmes de terror', 'Cozinhar uma receita nova', 'Jantar num restaurante escolhido ao acaso',
    'Café e conversa sem telemóveis', 'Torneio de jogos de tabuleiro', 'Duelo de videojogos', 'Karaoke em casa', 'Passeio de mãos dadas',
    'Ler lado a lado', 'Massagem a dois', 'Noite de spa caseiro', 'Pequeno-almoço na cama', 'Tomar um café com vista', 'Brunch num café novo'
  );

alter table public.couple_places
  add column verdict text check (verdict is null or verdict in ('liked', 'no'));
