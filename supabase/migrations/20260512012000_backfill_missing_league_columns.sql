alter table public.leagues
add column if not exists archived_at timestamptz;

alter table public.leagues
add column if not exists assignment_locked_at timestamptz;
