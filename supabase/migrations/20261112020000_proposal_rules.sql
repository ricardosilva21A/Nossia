-- Proposals: only the other one can accept a proposal (closing a date you proposed is fine),
-- and a date without a day is never a proposal.

create or replace function public.guard_proposal_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.proposal = 'proposed' and new.proposal = 'confirmed' and new.status = 'planned'
     and (select auth.uid()) is not null and (select auth.uid()) = old.proposed_by then
    raise exception 'Só o outro pode aceitar esta proposta' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists couple_dates_guard_proposal on public.couple_dates;
create trigger couple_dates_guard_proposal before update on public.couple_dates
  for each row execute function public.guard_proposal_acceptance();

-- Dates proposed before this rule without a day were never shown to the other one.
update public.couple_dates set proposal = 'confirmed' where proposal = 'proposed' and planned_for is null;

-- Whether the other one gets notifications on any device, so the app can say when they won't.
create or replace function public.partner_has_push()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members me
    join public.couple_members partner on partner.couple_id = me.couple_id and partner.user_id <> me.user_id
    join public.push_subscriptions device on device.user_id = partner.user_id
    where me.user_id = (select auth.uid())
  );
$$;

revoke all on function public.partner_has_push() from public, anon;
grant execute on function public.partner_has_push() to authenticated;
