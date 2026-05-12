# Tribal Ledger

Private Survivor fantasy league app built with Next.js 16, Clerk auth, and Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Clerk authentication
- Supabase Postgres (RLS + RPC)

## Core Gameplay

- Create or join private leagues by invite code
- Configure league game modes (`classic`, `high_risk`, `no_wagers`, `idol_hunter`, or custom)
- Rank castaways; league owner runs a one-time fair assignment (2 castaways/member)
- Weekly vote-out budget (10 free points by default)
- Extra wagers using earned vote points
- Sole Survivor pick with progressive payout
- Survivor-themed trash talk messages between league members

## Admin Workflow

- Weekly cron imports recap data and generates pending score drafts
- Admin can review/edit recap facts, recalculate deltas, and approve to lock standings updates
- New pending drafts trigger email notifications to league owners (when SMTP is configured)

## League Lifecycle

- League owners can archive leagues
- Archived leagues move out of active dashboard list
- Archived leagues cannot be joined via invite code

## Project Structure

- `app/(public)/` public pages (rules, cast, how-to-play)
- `app/(app)/` authenticated app pages
- `app/(app)/l/[leagueId]/` league pages (standings, ranking, wagers, team, recap, admin)
- `app/api/` API routes for league/game actions
- `lib/scoring.ts` scoring and payout logic
- `lib/assignment.ts` fairness-first assignment logic
- `lib/fsg-parser.ts` FSG recap parser
- `lib/notifications/email.ts` email notification helper
- `lib/supabase/server.ts` Supabase server clients
- `supabase/migrations/` schema and feature migrations

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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CRON_SECRET`
- `FSG_RECAP_URL`
- `FSG_SEASON_NUMBER`

Email notification values (required only if you want admin email notifications):

- `APP_BASE_URL` (for admin links in email)
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

## Supabase + Clerk Setup

1. In Clerk Dashboard, enable Supabase third-party integration.
2. In Supabase Dashboard, Auth -> Third-party Auth, add Clerk issuer URL.
3. Apply migrations in order from `supabase/migrations/`.

Notes:

- The app auto-bootstraps a default season during league creation if `seasons` is empty.
- Castaways still require seeding for ranking/assignment/wager flows.

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

## Security Notes

- `proxy.ts` enforces auth on protected routes.
- Service-role writes are restricted to server routes and key flows are enforced via ownership checks and SQL RPCs.
- Cron import endpoint requires `CRON_SECRET` and fails closed if missing.
