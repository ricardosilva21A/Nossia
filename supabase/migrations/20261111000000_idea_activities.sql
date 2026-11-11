-- One concrete label per idea, about what you do, instead of a feeling:
-- comer, ver, ar_livre, criar, cultura, jogar, descansar, conversar, escapadinha.
-- "special" marks ideas that suit an anniversary or another occasion.
-- category and mood stay for now; nothing reads them for filtering any more.

alter table public.ideas
  add column if not exists activity text check (activity is null or activity in ('comer', 'ver', 'ar_livre', 'criar', 'cultura', 'jogar', 'descansar', 'conversar', 'escapadinha')),
  add column if not exists special boolean not null default false;

-- The same rules as deriveActivity() in src/activities.ts.
create or replace function public.derive_idea_activity(idea_tags text[], idea_category text, idea_at_home boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when idea_tags && array['escapadinha'] then 'escapadinha'
    when idea_tags && array['spa'] then 'descansar'
    when idea_tags && array['conversa'] then 'conversar'
    when idea_tags && array['museu'] then 'cultura'
    when idea_tags && array['cinema', 'espetaculo', 'musica'] then 'ver'
    when idea_tags && array['jogos'] then 'jogar'
    when idea_tags && array['restaurante', 'cozinhar', 'doces', 'bebidas'] then 'comer'
    when idea_tags && array['natureza'] and idea_at_home then 'criar'
    when idea_tags && array['caminhada', 'natureza', 'praia'] then 'ar_livre'
    when idea_tags && array['desporto'] then 'jogar'
    when idea_tags && array['manual'] then 'criar'
    when idea_tags && array['compras'] then 'cultura'
    when idea_category = 'Food & drink' then 'comer'
    when idea_category = 'Culture' then 'cultura'
    when idea_category = 'Adventure' then 'ar_livre'
    when idea_category = 'Creative' then 'criar'
    when idea_category = 'Relaxing' then 'descansar'
    when idea_category = 'Romantic' and idea_at_home then 'conversar'
    else 'cultura'
  end;
$$;

-- Anything saved without a label (an import, an older screen) still gets one.
create or replace function public.fill_idea_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.activity is null then
    new.activity := public.derive_idea_activity(coalesce(new.tags, '{}'), new.category, coalesce(new.at_home, false));
  end if;
  return new;
end;
$$;

drop trigger if exists ideas_fill_activity on public.ideas;
create trigger ideas_fill_activity
  before insert or update on public.ideas
  for each row execute function public.fill_idea_activity();

update public.ideas
set activity = public.derive_idea_activity(coalesce(tags, '{}'), category, at_home),
    special = category = 'Romantic' or title ~* 'velas|namorados|primeiro encontro|pôr do sol|na cama|de hotel|fondue|termas|spa|adega|road trip|fotografia de casal|carta para abrir'
where activity is null;

-- A few catalogue ideas the rules place badly.
update public.ideas set activity = 'conversar'
where created_by_couple_id is null and title in ('Troca de recomendações', 'Rever fotografias antigas', 'Escrever os desejos para o novo ano', 'Fazer uma lista de primeiras vezes', 'Criar um ritual semanal');

update public.ideas set activity = 'cultura'
where created_by_couple_id is null and title in ('Ver as luzes de Natal', 'Ver uma cidade à noite', 'Ir ver uma árvore de Natal gigante');

update public.ideas set activity = 'jogar'
where created_by_couple_id is null and title = 'Noite de puzzles e música';

alter table public.ideas alter column activity set not null;

create index if not exists ideas_activity_idx on public.ideas (activity);
