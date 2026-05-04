alter table public.leagues
add column rule_set jsonb;

update public.leagues
set rule_set = jsonb_build_object(
  'event_points',
  jsonb_build_object(
    'individual immunity', 5,
    'tribe immunity', 3,
    'individual reward', 2,
    'tribe reward', 2,
    'gain immunity idol', 3,
    'gain advantage', 2,
    'voted out', 0,
    'quit/evac', 0
  ),
  'weekly_wager_budget', 10,
  'extra_wager_win_multiplier', 1,
  'wagers_enabled', true,
  'sole_survivor_enabled', true
)
where rule_set is null;

alter table public.leagues
alter column rule_set set not null;

alter table public.leagues
add constraint leagues_rule_set_shape_check
check (
  jsonb_typeof(rule_set) = 'object'
  and rule_set ? 'event_points'
  and rule_set ? 'weekly_wager_budget'
  and rule_set ? 'extra_wager_win_multiplier'
  and rule_set ? 'wagers_enabled'
  and rule_set ? 'sole_survivor_enabled'
  and jsonb_typeof(rule_set->'event_points') = 'object'
  and jsonb_typeof(rule_set->'weekly_wager_budget') = 'number'
  and jsonb_typeof(rule_set->'extra_wager_win_multiplier') = 'number'
  and jsonb_typeof(rule_set->'wagers_enabled') = 'boolean'
  and jsonb_typeof(rule_set->'sole_survivor_enabled') = 'boolean'
  and (rule_set->'event_points') ? 'individual immunity'
  and (rule_set->'event_points') ? 'tribe immunity'
  and (rule_set->'event_points') ? 'individual reward'
  and (rule_set->'event_points') ? 'tribe reward'
  and (rule_set->'event_points') ? 'gain immunity idol'
  and (rule_set->'event_points') ? 'gain advantage'
  and (rule_set->'event_points') ? 'voted out'
  and (rule_set->'event_points') ? 'quit/evac'
);

alter table public.leagues
add constraint leagues_rule_set_ranges_check
check (
  ((rule_set->>'weekly_wager_budget')::int between 0 and 100)
  and ((rule_set->>'extra_wager_win_multiplier')::numeric between 0 and 10)
  and ((rule_set->'event_points'->>'individual immunity')::int between -20 and 50)
  and ((rule_set->'event_points'->>'tribe immunity')::int between -20 and 50)
  and ((rule_set->'event_points'->>'individual reward')::int between -20 and 50)
  and ((rule_set->'event_points'->>'tribe reward')::int between -20 and 50)
  and ((rule_set->'event_points'->>'gain immunity idol')::int between -20 and 50)
  and ((rule_set->'event_points'->>'gain advantage')::int between -20 and 50)
  and ((rule_set->'event_points'->>'voted out')::int between -20 and 50)
  and ((rule_set->'event_points'->>'quit/evac')::int between -20 and 50)
);

