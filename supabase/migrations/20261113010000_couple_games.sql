-- Couple games. Each answer belongs to whoever gave it. The other one's answer to a question
-- stays hidden until you have answered it too, so nobody can peek before guessing.

create table if not exists public.game_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null check (question_id ~ '^[a-z][0-9]{2,3}$'),
  role text not null default 'self' check (role in ('self', 'guess')),
  answer text not null check (length(trim(answer)) between 1 and 300),
  created_at timestamptz not null default now(),
  pushed_at timestamptz,
  unique (couple_id, user_id, question_id, role)
);

create index if not exists game_answers_question_idx on public.game_answers (couple_id, question_id);
create index if not exists game_answers_user_idx on public.game_answers (user_id, pushed_at);

-- Whether the signed-in person has answered this question. A function, so the select policy
-- doesn't read its own table (that would recurse).
create or replace function public.game_answered(target_couple uuid, target_question text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.game_answers
    where couple_id = target_couple and question_id = target_question and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.game_answered(uuid, text) from public, anon;
grant execute on function public.game_answered(uuid, text) to authenticated;

alter table public.game_answers enable row level security;
grant select, insert on public.game_answers to authenticated;
grant select, insert, update, delete on public.game_answers to service_role;

create policy "See your answers, and the other's once you answered too" on public.game_answers for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (user_id = (select auth.uid()) or public.game_answered(couple_id, question_id))
  );
create policy "Answer as yourself" on public.game_answers for insert to authenticated
  with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

create trigger couple_sync_touch after insert or update or delete on public.game_answers
  for each row execute function public.touch_couple_sync('couple_id');

-- Which questions the other one answered and this person hasn't: ids only, never the answers.
create or replace function public.game_waiting()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct theirs.question_id), '{}')
  from public.game_answers theirs
  join public.couple_members me on me.couple_id = theirs.couple_id and me.user_id = (select auth.uid())
  where theirs.user_id <> (select auth.uid())
    and not exists (
      select 1 from public.game_answers mine
      where mine.couple_id = theirs.couple_id and mine.question_id = theirs.question_id and mine.user_id = (select auth.uid())
    );
$$;

revoke execute on function public.game_waiting() from public, anon;
grant execute on function public.game_waiting() to authenticated;

alter table public.notification_settings
  add column if not exists games boolean not null default true;
