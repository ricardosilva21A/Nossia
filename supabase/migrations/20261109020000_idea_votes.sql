-- Each person's private likes and passes, and what they add up to for the couple.

alter table public.ideas add column tags text[] not null default '{}';

update public.ideas i
set tags = array(
  select v.tag
  from (values
    ('museu', 'museu|galeria|arte urbana|presépio'),
    ('espetaculo', 'teatro|concerto|festival|desfile|fogo de artifício'),
    ('cinema', 'filme|cinema|documentário|maratona'),
    ('musica', 'música|playlist|álbum inteiro|karaoke'),
    ('caminhada', 'caminhada|passeio|rota|miradouro|geocaching|explorar'),
    ('natureza', 'jardim|parque|árvores|folhas|nuvens|estrelas|nascer do sol|pôr do sol|aves|plantar|terrário|serra'),
    ('praia', 'praia|banho ao fim'),
    ('desporto', 'escalada|padel|bowling|patinar|bicicleta|treino|mini-golf'),
    ('jogos', 'jogos|videojogos|puzzle|quiz|casino|mistérios|escape room|lego|caça'),
    ('cozinhar', 'cozinhar|fazer pizza|fazer sopa|fazer bolachas|fazer filhós|fazer um folar|sardinhada|fondue|sobremesas|jantar.*em casa|noite italiana|jantar temático|magusto'),
    ('restaurante', 'restaurante|brunch|prato desconhecido|comida de um país'),
    ('doces', 'chocolate|sobremesa|gelados|pastelarias|bolos-rei|bolachas'),
    ('bebidas', 'adega|chás|mocktail|café|refrigerantes'),
    ('spa', 'spa|termas|massagem|piscina'),
    ('manual', 'cerâmica|pintar|pintura|desenh|origami|pulseiras|prendas à mão|canecas|esculpir|disfarces|postais'),
    ('conversa', 'perguntas|cartas?|entrevista|elogios|gratidão|conversa|história a quatro|sonhos|balanço'),
    ('compras', 'compras|loja|mercado|feira|livraria'),
    ('escapadinha', 'comboio|road trip|vila|escapadinha|neve')
  ) as v(tag, pattern)
  where lower(i.title) ~ v.pattern
)
where i.created_by_couple_id is null;

create table public.idea_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  vote text not null check (vote in ('like', 'pass')),
  updated_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);

create index idea_votes_couple_idx on public.idea_votes (couple_id);
create index idea_votes_idea_idx on public.idea_votes (idea_id);

alter table public.idea_votes enable row level security;
grant select, insert, update, delete on public.idea_votes to authenticated;
grant select, insert, update, delete on public.idea_votes to service_role;

create policy "People read their own votes" on public.idea_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "People add their own votes" on public.idea_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));
create policy "People change their own votes" on public.idea_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));
create policy "People remove their own votes" on public.idea_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- What the votes mean for the couple, without saying who voted what.
create function public.couple_idea_signals()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select couple_id from public.couple_members where user_id = (select auth.uid()) limit 1
  ),
  totals as (
    select v.idea_id, count(*) filter (where v.vote = 'like') as likes, count(*) filter (where v.vote = 'pass') as passes
    from public.idea_votes v
    where v.couple_id = (select couple_id from mine)
    group by v.idea_id
  ),
  tag_totals as (
    select tag, sum(t.likes) as likes, sum(t.passes) as passes
    from totals t
    join public.ideas i on i.id = t.idea_id
    cross join lateral unnest(i.tags) as tag
    group by tag
  )
  select jsonb_build_object(
    'ideas', coalesce((
      select jsonb_object_agg(idea_id, case when likes >= 2 then 'both_like' when passes >= 2 then 'both_pass' else 'less' end)
      from totals
      where likes >= 2 or passes >= 1
    ), '{}'::jsonb),
    'avoided_tags', coalesce((select jsonb_agg(tag) from tag_totals where passes >= 3 and likes = 0), '[]'::jsonb)
  );
$$;

revoke all on function public.couple_idea_signals() from public, anon;
grant execute on function public.couple_idea_signals() to authenticated;
