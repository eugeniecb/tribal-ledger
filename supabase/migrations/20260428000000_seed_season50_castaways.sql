-- Seed Season 50 and castaways from Fantasy Survivor Game (names + draft images)

insert into public.seasons (number, name, total_episodes, fsg_recap_url, episode_lock_weekday, episode_lock_hour_et)
values (50, 'Survivor 50', 13, 'https://www.fantasysurvivorgame.com/episode-recap/season/50', 3, 20)
on conflict (number) do update set
  name = excluded.name,
  total_episodes = excluded.total_episodes,
  fsg_recap_url = excluded.fsg_recap_url,
  episode_lock_weekday = excluded.episode_lock_weekday,
  episode_lock_hour_et = excluded.episode_lock_hour_et;

with s as (
  select id from public.seasons where number = 50 limit 1
)
delete from public.castaways c
using s
where c.season_id = s.id;

with s as (
  select id from public.seasons where number = 50 limit 1
)
insert into public.castaways (season_id, name, image_url, tribe, is_eliminated, eliminated_episode)
select s.id, v.name, v.image_url, null, false, null
from s
cross join (
  values
    ('"Q"', 'https://www.fantasysurvivorgame.com/images/50/draftpics/%22q%22DFT.jpg'),
    ('Angelina', 'https://www.fantasysurvivorgame.com/images/50/draftpics/angelinaDFT.jpg'),
    ('Aubry', 'https://www.fantasysurvivorgame.com/images/50/draftpics/aubryDFT.jpg'),
    ('Charlie', 'https://www.fantasysurvivorgame.com/images/50/draftpics/charlieDFT.jpg'),
    ('Chrissy', 'https://www.fantasysurvivorgame.com/images/50/draftpics/chrissyDFT.jpg'),
    ('Christian', 'https://www.fantasysurvivorgame.com/images/50/draftpics/christianDFT.jpg'),
    ('Cirie', 'https://www.fantasysurvivorgame.com/images/50/draftpics/cirieDFT.jpg'),
    ('Coach', 'https://www.fantasysurvivorgame.com/images/50/draftpics/coachDFT.jpg'),
    ('Colby', 'https://www.fantasysurvivorgame.com/images/50/draftpics/colbyDFT.jpg'),
    ('Dee', 'https://www.fantasysurvivorgame.com/images/50/draftpics/deeDFT.jpg'),
    ('Emily', 'https://www.fantasysurvivorgame.com/images/50/draftpics/emilyDFT.jpg'),
    ('Genevieve', 'https://www.fantasysurvivorgame.com/images/50/draftpics/genevieveDFT.jpg'),
    ('Jenna', 'https://www.fantasysurvivorgame.com/images/50/draftpics/jennaDFT.jpg'),
    ('Joe', 'https://www.fantasysurvivorgame.com/images/50/draftpics/joeDFT.jpg'),
    ('Jonathan', 'https://www.fantasysurvivorgame.com/images/50/draftpics/jonathanDFT.jpg'),
    ('Kamilla', 'https://www.fantasysurvivorgame.com/images/50/draftpics/kamillaDFT.jpg'),
    ('Kyle', 'https://www.fantasysurvivorgame.com/images/50/draftpics/kyleDFT.jpg'),
    ('Mike', 'https://www.fantasysurvivorgame.com/images/50/draftpics/mikeDFT.jpg'),
    ('Ozzy', 'https://www.fantasysurvivorgame.com/images/50/draftpics/ozzyDFT.jpg'),
    ('Rick', 'https://www.fantasysurvivorgame.com/images/50/draftpics/rickDFT.jpg'),
    ('Rizo', 'https://www.fantasysurvivorgame.com/images/50/draftpics/rizoDFT.jpg'),
    ('Savannah', 'https://www.fantasysurvivorgame.com/images/50/draftpics/savannahDFT.jpg'),
    ('Stephenie', 'https://www.fantasysurvivorgame.com/images/50/draftpics/stephenieDFT.jpg'),
    ('Tiffany', 'https://www.fantasysurvivorgame.com/images/50/draftpics/tiffanyDFT.jpg')
) as v(name, image_url);
