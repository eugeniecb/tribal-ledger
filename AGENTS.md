<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Note: Next.js 16 deprecated `middleware.ts` — the file is now called `proxy.ts`. If you see the "middleware is deprecated" warning, rename the file.
<!-- END:nextjs-agent-rules -->

# Tribal Ledger — Survivor Fantasy League

## Project Summary

Private Survivor fantasy league app. Stack: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Supabase Postgres + Clerk auth.

## Architecture

- `app/page.tsx`: Public landing page.
- `app/(public)/`: Public info pages (rules, how-to-play, cast).
- `app/(app)/`: Auth-protected app pages.
- `app/(app)/l/[leagueId]/`: Per-league pages (standings, rankings, wager, team, sole-survivor, recap, admin).
- `app/api/`: API routes for leagues, wagers, rankings, assignments, sole-survivor, cron import, score draft approval.
- `lib/scoring.ts`: Scoring rules, wager settlement, Sole Survivor payout.
- `lib/assignment.ts`: Fairness-first 2-castaway team assignment (beam search).
- `lib/fsg-parser.ts`: Cheerio-based FSG recap HTML parser.
- `lib/types.ts`: Shared TypeScript domain types.
- `lib/supabase/server.ts`: User (Clerk JWT) + service-role Supabase clients.
- `supabase/migrations/20260426000000_initial_schema.sql`: Full schema, RLS policies, and `approve_score_draft` RPC.

## Auth

Clerk auth with native Supabase third-party JWT integration. Clerk JWTs are accepted by Supabase RLS; `auth.jwt()->>'sub'` is the Clerk user id (text, not uuid).

## Key Scoring Rules

- Weekly budget: 10 free pts/week, allocate across expected vote-outs. Correct = +allocated (1x). Wrong = lost.
- Extra wagers: risk earned vote_points. Correct = net +wager. Wrong = net −wager. Stacking allowed.
- Wagers lock: Wed 8pm ET (episode airtime).
- Sole Survivor: pick any time, never locks. Payout = (total_episodes − selected_at_episode + 1) if correct.

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

## Setup Checklist (one-time)

1. Create Supabase project. Copy URL, anon key, service role key.
2. Create Clerk application. Copy publishable + secret keys.
3. Clerk dashboard → Connect → Supabase: enable third-party auth integration.
4. Supabase dashboard → Auth → Third-party Auth: add Clerk (paste Clerk issuer URL).
5. Run `supabase/migrations/20260426000000_initial_schema.sql` in Supabase SQL editor.
6. Create a `seasons` row for Season 50 and seed castaways.
7. Populate `.env.local` (see `.env.example`).
8. Run `npm run dev`.

## Known Issue

`middleware.ts` generates a deprecation warning in Next.js 16 (should be `proxy.ts`). Functionality is unaffected.
