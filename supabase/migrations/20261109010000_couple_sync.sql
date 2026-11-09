-- One row per couple that changes whenever their data does, so each phone listens to a single
-- signal. Realtime can't filter delete events on the tables themselves.
create table public.couple_sync (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by uuid
);

alter table public.couple_sync enable row level security;
grant select on public.couple_sync to authenticated;
grant select, insert, update, delete on public.couple_sync to service_role;

create policy "Members can see their couple's changes" on public.couple_sync for select to authenticated
  using (public.is_couple_member(couple_id));

create function public.touch_couple_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target uuid := (row_data ->> tg_argv[0])::uuid;
begin
  -- During a cascade the couple is already gone, and there's nobody left to tell.
  if target is not null and exists (select 1 from public.couples where id = target) then
    insert into public.couple_sync (couple_id, changed_at, changed_by)
    values (target, now(), (select auth.uid()))
    on conflict (couple_id) do update set changed_at = excluded.changed_at, changed_by = excluded.changed_by;
  end if;
  return null;
end;
$$;

revoke all on function public.touch_couple_sync() from public, anon, authenticated;

create trigger couple_sync_touch after insert or update or delete on public.couple_dates for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_commitments for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_tasks for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_trips for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.trip_items for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.trip_photos for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.date_photos for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_destinations for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_idea_favorites for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.work_schedule_blocks for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_places for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_mascots for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.couple_members for each row execute function public.touch_couple_sync('couple_id');
create trigger couple_sync_touch after insert or update or delete on public.ideas for each row execute function public.touch_couple_sync('created_by_couple_id');
create trigger couple_sync_touch after update on public.couples for each row execute function public.touch_couple_sync('id');

alter publication supabase_realtime add table public.couple_sync;
