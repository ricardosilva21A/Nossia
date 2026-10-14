create table public.date_idea_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null,
  duration text not null default 'To decide',
  budget text not null default 'To decide',
  emoji text not null default '💌',
  mood text not null
    check (mood in ('Romantic', 'Fun', 'Relaxing', 'Adventure', 'Creative', 'Surprise me')),
  duration_minutes integer not null check (duration_minutes > 0),
  budget_eur numeric(8, 2) not null check (budget_eur >= 0),
  travel_minutes smallint check (travel_minutes is null or travel_minutes >= 0),
  at_home boolean not null default false,
  created_at timestamptz not null default now(),
  unique (title, description)
);

alter table public.date_ideas
  add column source_template_id uuid references public.date_idea_templates(id) on delete set null;

create index date_idea_templates_mood_duration_idx
  on public.date_idea_templates (mood, duration_minutes);

alter table public.date_idea_templates enable row level security;
grant select, insert, update, delete on public.date_idea_templates to authenticated;

create policy "Authenticated couples can read default date ideas"
  on public.date_idea_templates for select
  to authenticated
  using (true);

create policy "Catalog admins can add default date ideas"
  on public.date_idea_templates for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');

create policy "Catalog admins can update default date ideas"
  on public.date_idea_templates for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');

create policy "Catalog admins can delete default date ideas"
  on public.date_idea_templates for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'catalog_admin') = 'true');

insert into public.date_idea_templates (
  title, description, category, duration, budget, emoji, mood,
  duration_minutes, budget_eur, travel_minutes, at_home
)
values
  ('Sunset picnic', 'Pack a basket with your favourite treats and find a little spot to call your own.', 'Romantic', '2–3 hours', '€€', '🧺', 'Romantic', 150, 30, null, false),
  ('Cook something new', 'Choose a cuisine, put on some music and make dinner together, no rush.', 'Food & drink', '1–2 hours', '€', '🍝', 'Fun', 90, 10, 0, true),
  ('Wander without a plan', 'Pick a direction, put your phones away and discover somewhere new.', 'Adventure', '2 hours', 'Free', '🚲', 'Adventure', 120, 0, 15, false),
  ('A games night for two', 'A little friendly competition, snacks and the winner picks the next film.', 'Relaxing', '2 hours', '€', '🎲', 'Relaxing', 120, 10, 0, true),
  ('Visit a museum', 'Choose an exhibition and share the pieces that make you feel something.', 'Culture', '2–3 hours', '€€', '🖼️', 'Fun', 150, 30, null, false),
  ('Try a pottery class', 'Make something with your hands. Wonky little creations tell stories too.', 'Creative', '2 hours', '€€€', '🏺', 'Creative', 120, 60, null, false),
  ('Breakfast in bed', 'Start the day slowly with coffee, fruit and a morning just for the two of you.', 'Romantic', '1 hour', '€', '🥐', 'Romantic', 60, 10, 0, true),
  ('Find a scenic trail', 'Bring some water, wear comfy shoes and find a beautiful path to explore.', 'Adventure', '3–4 hours', 'Free', '🥾', 'Adventure', 210, 0, null, false)
on conflict (title, description) do nothing;

with starter_matches as (
  select
    couple_idea.id as idea_id,
    template.id as template_id,
    row_number() over (
      partition by couple_idea.couple_id, template.id
      order by couple_idea.created_at, couple_idea.id
    ) as match_number
  from public.date_ideas as couple_idea
  join public.date_idea_templates as template
    on couple_idea.title = template.title
    and couple_idea.description = template.description
  where couple_idea.source_template_id is null
)
update public.date_ideas as couple_idea
set source_template_id = starter_matches.template_id
from starter_matches
where couple_idea.id = starter_matches.idea_id
  and starter_matches.match_number = 1;

create unique index date_ideas_couple_template_idx
  on public.date_ideas (couple_id, source_template_id)
  where source_template_id is not null;
