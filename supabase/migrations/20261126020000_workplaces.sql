-- Where each person works and what they do: on work days the house shows them at their desk.
alter table public.couple_mascots
  add column if not exists workplace text check (workplace is null or length(workplace) between 1 and 40),
  add column if not exists work_kind text not null default 'office' check (work_kind in ('tech', 'design', 'office'));
