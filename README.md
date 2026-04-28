# Tribal Ledger

Private Survivor fantasy league app built with Next.js 16, Clerk auth, and Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Clerk authentication
- Supabase Postgres (RLS + RPC)

## Core Gameplay

- Create or join private leagues by invite code
- Rank castaways; fair assignment algorithm gives each member 2 castaways
- Weekly vote-out budget (10 free points each week)
- Extra wagers using earned vote points
- Sole Survivor pick with progressive payout

## Project Structure

- `app/(public)/` public pages (rules, cast, how-to-play)
- `app/(app)/` authenticated app pages
- `app/(app)/l/[leagueId]/` league pages (standings, ranking, wagers, team, recap, admin)
- `app/api/` API routes for league/game actions
- `lib/scoring.ts` scoring and payout logic
- `lib/assignment.ts` fairness-first assignment logic
- `lib/fsg-parser.ts` FSG recap parser
- `lib/supabase/server.ts` Supabase server clients
- `supabase/migrations/` schema and seed migrations

## Prerequisites

- Node.js 20+
- npm
- Supabase project
- Clerk application

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CRON_SECRET`

## Supabase + Clerk Setup

1. In Clerk Dashboard, enable Supabase third-party integration.
2. In Supabase Dashboard, Auth -> Third-party Auth, add Clerk issuer URL.
3. Apply migrations in order:

```sql
-- 1) Base schema + RLS + RPC
supabase/migrations/20260426000000_initial_schema.sql

-- 2) Season 50 castaway seed (names + images)
supabase/migrations/20260428000000_seed_season50_castaways.sql
```

Notes:
- The app auto-bootstraps a default season during league creation if `seasons` is empty.
- Castaways still require seeding for ranking/assignment/wager flows to be usable.

## Local Development

Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

## Known Issue

Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. If you see the middleware deprecation warning, rename the file.
