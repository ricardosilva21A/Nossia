-- Written answers in "Quanto me conheces?": the one the question is about says whether the
-- other's guess was right ("hit"), nearly ("close") or wrong ("miss").
alter table public.game_answers drop constraint if exists game_answers_role_check;
alter table public.game_answers add constraint game_answers_role_check check (role in ('self', 'guess', 'verdict'));
alter table public.game_answers add constraint game_answers_verdict_check check (role <> 'verdict' or answer in ('hit', 'close', 'miss'));
