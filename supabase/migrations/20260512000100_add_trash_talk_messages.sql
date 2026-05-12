create table public.trash_talk_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  sender_member_id uuid not null references public.league_members(id) on delete cascade,
  recipient_member_id uuid not null references public.league_members(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  check (sender_member_id <> recipient_member_id)
);

alter table public.trash_talk_messages enable row level security;

create policy "trash_talk_select"
on public.trash_talk_messages
for select
using (private.is_league_member(league_id));

create policy "trash_talk_insert"
on public.trash_talk_messages
for insert
with check (private.is_own_member(sender_member_id));
