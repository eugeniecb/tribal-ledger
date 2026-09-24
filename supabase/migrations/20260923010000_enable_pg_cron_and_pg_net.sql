-- pg_cron + pg_net let Supabase call app job endpoints on a precise schedule
-- (Vercel Hobby crons only guarantee the hour). Job secrets live in Vault, not here.
create extension if not exists pg_cron;
create extension if not exists pg_net;
