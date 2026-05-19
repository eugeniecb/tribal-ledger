-- Allow league members to read each other's profile rows.
-- Needed for standings/trash-talk UI to resolve display names across members.
drop policy if exists "profiles_select_same_league" on profiles;

create policy "profiles_select_same_league"
on profiles
for select
using (
  exists (
    select 1
    from league_members me
    join league_members them on them.profile_id = profiles.id
    where me.profile_id = (auth.jwt()->>'sub')
      and me.league_id = them.league_id
  )
);
