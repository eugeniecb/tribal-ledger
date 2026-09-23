-- Seed Season 51 and castaways from Fantasy Survivor Game (names + draft images)
-- Idempotent: only inserts castaways that don't already exist, so re-running is safe
-- after leagues/rankings reference castaway ids.

insert into public.seasons (number, name, total_episodes, fsg_recap_url, episode_lock_weekday, episode_lock_hour_et)
values (51, 'Survivor 51', 13, 'https://www.fantasysurvivorgame.com/episode-recap/season/51', 3, 20)
on conflict (number) do update set
  name = excluded.name,
  total_episodes = excluded.total_episodes,
  fsg_recap_url = excluded.fsg_recap_url,
  episode_lock_weekday = excluded.episode_lock_weekday,
  episode_lock_hour_et = excluded.episode_lock_hour_et;

with s as (
  select id from public.seasons where number = 51 limit 1
)
insert into public.castaways (season_id, name, image_url, tribe, is_eliminated, eliminated_episode)
select s.id, v.name, v.image_url, null, false, null
from s
cross join (
  values
    ('Aaliyah', 'https://www.fantasysurvivorgame.com/images/51/draftpics/aaliyahDFT.jpg'),
    ('Alexis', 'https://www.fantasysurvivorgame.com/images/51/draftpics/alexisDFT.jpg'),
    ('Ana', 'https://www.fantasysurvivorgame.com/images/51/draftpics/anaDFT.jpg'),
    ('Brady', 'https://www.fantasysurvivorgame.com/images/51/draftpics/bradyDFT.jpg'),
    ('Carter', 'https://www.fantasysurvivorgame.com/images/51/draftpics/carterDFT.jpg'),
    ('Cristian', 'https://www.fantasysurvivorgame.com/images/51/draftpics/cristianDFT.jpg'),
    ('Devin', 'https://www.fantasysurvivorgame.com/images/51/draftpics/devinDFT.jpg'),
    ('Eric', 'https://www.fantasysurvivorgame.com/images/51/draftpics/ericDFT.jpg'),
    ('Jelly', 'https://www.fantasysurvivorgame.com/images/51/draftpics/jellyDFT.jpg'),
    ('Jenna', 'https://www.fantasysurvivorgame.com/images/51/draftpics/jennaDFT.jpg'),
    ('Kilby', 'https://www.fantasysurvivorgame.com/images/51/draftpics/kilbyDFT.jpg'),
    ('Kristin', 'https://www.fantasysurvivorgame.com/images/51/draftpics/kristinDFT.jpg'),
    ('Lewis', 'https://www.fantasysurvivorgame.com/images/51/draftpics/lewisDFT.jpg'),
    ('Linnea', 'https://www.fantasysurvivorgame.com/images/51/draftpics/linneaDFT.jpg'),
    ('Maggie', 'https://www.fantasysurvivorgame.com/images/51/draftpics/maggieDFT.jpg'),
    ('Mike', 'https://www.fantasysurvivorgame.com/images/51/draftpics/mikeDFT.jpg'),
    ('Ori', 'https://www.fantasysurvivorgame.com/images/51/draftpics/oriDFT.jpg'),
    ('Patt', 'https://www.fantasysurvivorgame.com/images/51/draftpics/pattDFT.jpg'),
    ('Rob', 'https://www.fantasysurvivorgame.com/images/51/draftpics/robDFT.jpg'),
    ('Sharonda', 'https://www.fantasysurvivorgame.com/images/51/draftpics/sharondaDFT.jpg'),
    ('Thien An', 'https://www.fantasysurvivorgame.com/images/51/draftpics/thien%20anDFT.jpg')
) as v(name, image_url)
where not exists (
  select 1 from public.castaways c
  where c.season_id = s.id and lower(c.name) = lower(v.name)
);
