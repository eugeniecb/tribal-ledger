create or replace function public.archive_league(
  p_league_id uuid,
  p_actor_id text
)
returns void
language plpgsql
security definer
as $$
declare
  v_is_owner boolean;
begin
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
      and lm.profile_id = p_actor_id
      and lm.role = 'owner'
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only league owners can archive leagues';
  end if;

  update public.leagues
  set archived_at = now()
  where id = p_league_id
    and archived_at is null;
end;
$$;

create or replace function public.send_trash_talk(
  p_league_id uuid,
  p_actor_id text,
  p_recipient_member_id uuid
)
returns text
language plpgsql
security definer
as $$
declare
  v_sender_member_id uuid;
  v_recipient_member_id uuid;
  v_message text;
  v_count int;
  v_bank text[] := array[
    'Your torch is basically a candle at this point.',
    'You brought a snorkel to a fire challenge.',
    'I have seen sturdier alliances in a coconut husk.',
    'You are playing chess like it is checkers, badly.',
    'Your blindside radar is set to airplane mode.',
    'Even Jeff would call that move questionable.',
    'You are one immunity idol away from total chaos.',
    'Your strategy has more holes than a fishing net.',
    'You are at Ponderosa in spirit already.',
    'I would say outwit, outplay, outlast, but you skipped step one.'
  ];
begin
  select lm.id
  into v_sender_member_id
  from public.league_members lm
  where lm.league_id = p_league_id
    and lm.profile_id = p_actor_id
  limit 1;

  if v_sender_member_id is null then
    raise exception 'Not authorized for this league';
  end if;

  select lm.id
  into v_recipient_member_id
  from public.league_members lm
  where lm.id = p_recipient_member_id
    and lm.league_id = p_league_id
  limit 1;

  if v_recipient_member_id is null then
    raise exception 'Recipient not found in this league';
  end if;

  if v_sender_member_id = v_recipient_member_id then
    raise exception 'Cannot trash talk yourself';
  end if;

  select count(*)
  into v_count
  from public.trash_talk_messages t
  where t.league_id = p_league_id
    and t.sender_member_id = v_sender_member_id;

  v_message := v_bank[(v_count % array_length(v_bank, 1)) + 1];

  insert into public.trash_talk_messages (
    league_id,
    sender_member_id,
    recipient_member_id,
    message
  ) values (
    p_league_id,
    v_sender_member_id,
    v_recipient_member_id,
    v_message
  );

  return v_message;
end;
$$;
