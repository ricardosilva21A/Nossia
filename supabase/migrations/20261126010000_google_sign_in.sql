-- Sign in with Google: the account arrives without the couple's details, so the couple is set
-- up right after, in the app, instead of in the sign-up trigger.

create or replace function public.create_couple_for_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_code text := nullif(new.raw_user_meta_data ->> 'invite_code', '');
  invite public.couple_invites%rowtype;
  new_couple_id uuid;
begin
  if invite_code is not null then
    select * into invite
    from public.couple_invites
    where code = invite_code and used_at is null and expires_at > now()
    for update;

    if not found then
      raise exception 'This invite link is invalid or has expired.';
    end if;

    insert into public.couple_members (couple_id, user_id, partner_slot)
    values (invite.couple_id, new.id, 'partner_two');

    update public.couple_invites
    set used_by = new.id, used_at = now()
    where code = invite.code;

    if nullif(new.raw_user_meta_data ->> 'partner_name', '') is not null then
      update public.couples
      set partner_two_name = new.raw_user_meta_data ->> 'partner_name', updated_at = now()
      where id = invite.couple_id;
    end if;

    return new;
  end if;

  -- Google (and any sign-up without the couple's details): no couple yet, the app asks next.
  if nullif(new.raw_user_meta_data ->> 'relationship_date', '') is null then
    return new;
  end if;

  insert into public.couples (
    account_user_id, partner_one_name, partner_two_name, partner_one_birth_date, partner_two_birth_date,
    relationship_date, first_met_date, first_message_date, first_date_date
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'partner_one_name', ''), 'Partner 1'),
    coalesce(nullif(new.raw_user_meta_data ->> 'partner_two_name', ''), 'Partner 2'),
    nullif(new.raw_user_meta_data ->> 'partner_one_birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'partner_two_birth_date', '')::date,
    (new.raw_user_meta_data ->> 'relationship_date')::date,
    nullif(new.raw_user_meta_data ->> 'first_met_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'first_message_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'first_date_date', '')::date
  )
  returning id into new_couple_id;

  insert into public.couple_members (couple_id, user_id, partner_slot)
  values (new_couple_id, new.id, 'partner_one');

  return new;
end;
$$;

-- A signed-in person without a couple starts one (asked right after creating the account,
-- with email or with Google).
create or replace function public.setup_my_couple(my_name text, partner_name text, together_since date, my_birth_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_couple_id uuid;
begin
  if me is null then raise exception 'Not signed in.'; end if;
  if exists (select 1 from public.couple_members where user_id = me) then raise exception 'This account already has a couple.'; end if;
  if length(trim(coalesce(my_name, ''))) not between 1 and 80 or length(trim(coalesce(partner_name, ''))) not between 1 and 80 then raise exception 'Names are required.'; end if;
  if together_since is null or together_since > current_date then raise exception 'The relationship date is required.'; end if;

  if my_birth_date is not null and my_birth_date > current_date then raise exception 'The birth date is in the future.'; end if;

  insert into public.couples (account_user_id, partner_one_name, partner_two_name, relationship_date, partner_one_birth_date)
  values (me, trim(my_name), trim(partner_name), together_since, my_birth_date)
  returning id into new_couple_id;

  insert into public.couple_members (couple_id, user_id, partner_slot)
  values (new_couple_id, me, 'partner_one');

  return new_couple_id;
end;
$$;

-- A signed-in person without a couple joins the other one's with the invite link's code.
create or replace function public.join_couple_by_invite(invite_code text, my_name text, my_birth_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  invite public.couple_invites%rowtype;
begin
  if me is null then raise exception 'Not signed in.'; end if;
  if exists (select 1 from public.couple_members where user_id = me) then raise exception 'This account already has a couple.'; end if;

  select * into invite
  from public.couple_invites
  where code = invite_code and used_at is null and expires_at > now()
  for update;
  if not found then raise exception 'This invite link is invalid or has expired.'; end if;

  insert into public.couple_members (couple_id, user_id, partner_slot)
  values (invite.couple_id, me, 'partner_two');

  update public.couple_invites set used_by = me, used_at = now() where code = invite.code;

  update public.couples
  set partner_two_name = case when length(trim(coalesce(my_name, ''))) between 1 and 80 then trim(my_name) else partner_two_name end,
      partner_two_birth_date = case when my_birth_date is not null and my_birth_date <= current_date then my_birth_date else partner_two_birth_date end,
      updated_at = now()
  where id = invite.couple_id;

  return invite.couple_id;
end;
$$;

revoke execute on function public.setup_my_couple(text, text, date, date) from public, anon;
revoke execute on function public.join_couple_by_invite(text, text, date) from public, anon;
grant execute on function public.setup_my_couple(text, text, date, date) to authenticated;
grant execute on function public.join_couple_by_invite(text, text, date) to authenticated;
