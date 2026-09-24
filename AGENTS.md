<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Note: Next.js 16 deprecated `middleware.ts` — the file is now called `proxy.ts`. If you see the "middleware is deprecated" warning, rename the file.
<!-- END:nextjs-agent-rules -->

# Tribal Ledger — Survivor Fantasy League

## Project Summary

Private Survivor fantasy league app.
Stack: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Supabase Postgres + Clerk auth.

## Architecture

- `app/page.tsx`: Public landing page.
- `app/(public)/`: Public info pages (rules, how-to-play, cast).
- `app/(app)/`: Auth-protected app pages.
- `app/(app)/dashboard/page.tsx`: Active + archived league overview.
- `app/(app)/l/[leagueId]/`: Per-league pages (standings, rankings, wager, team, sole-survivor, recap, admin, rules).
- `app/api/`: API routes for leagues, wagers, rankings, assignments, sole-survivor, trash talk, cron import, and score draft review/approval.
- `lib/scoring.ts`: Scoring rules, wager settlement, Sole Survivor payout.
- `lib/assignment.ts`: Fairness-first 2-castaway team assignment (beam search).
- `lib/fsg-parser.ts`: Cheerio-based FSG recap HTML parser.
- `lib/rules.ts`: Rule schema + game mode presets.
- `lib/notifications/email.ts`: SMTP draft-ready notifications.
- `lib/types.ts`: Shared TypeScript domain types.
- `lib/supabase/server.ts`: User (Clerk JWT) + service-role Supabase clients.
- `supabase/migrations/`: Schema + RLS + RPC + feature migrations.

## Auth & Security

- Clerk auth with native Supabase third-party JWT integration.
- Clerk JWTs are accepted by Supabase RLS; `auth.jwt()->>'sub'` is Clerk user id (text).
- `profiles` read access is scoped by shared league membership so members can see each other's display names in league UIs.
- `proxy.ts` protects app/api surfaces except explicitly public routes.
- Cron endpoint requires `CRON_SECRET` and fails closed when missing.
- Sensitive writes are enforced via SQL RPCs where possible (`approve_score_draft`, `archive_league`, `send_trash_talk`).

## Gameplay Features

- League game modes: `classic`, `high_risk`, `no_wagers`, `idol_hunter`, custom.
- One-time assignment lock per league (`assignment_locked_at`).
- League archiving (`archived_at`) and archived join prevention.
- Trash talk message feature between league members.
- Admin recap review/edit, recalc draft deltas, then approve/lock scoring.

## Key Scoring Rules

- Weekly budget: default 10 free points/week **per tribe**, allocated across that tribe's expected vote-outs (one budget after the merge). Tribes sync from FSG's survivors page (`lib/fsg-tribes.ts`) on every recap import; `validateWager` enforces the per-tribe cap server-side.
- Extra wagers: risk earned vote points; wins/losses affect totals.
- Wagers lock: Wednesday 8pm ET (configurable by season fields) when the upcoming episode airs, and stay locked until its recap is imported; then the next episode opens (`lib/wager-lock.ts`). Only the upcoming episode (latest import + 1) accepts wagers.
- Sole Survivor payout: `(total_episodes - selected_at_episode + 1)` if correct.
- FSG recap parsing reads only `h5.recap-episode` blocks and their `<dt>`/`<dd>` event lists (every castaway in a `<dd>` earns that event). `FSG_EVENT_KEYS` in `lib/fsg-parser.ts` maps FSG titles to `event_points` keys; unmapped titles (e.g. "Find Food") keep their lowercased title and score 0 unless a league adds that key.

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

## Setup Checklist (one-time)

1. Create Supabase project. Copy URL, anon/publishable key, service role key.
2. Create Clerk application. Copy publishable + secret keys.
3. Clerk dashboard -> Connect -> Supabase: enable third-party auth integration.
4. Supabase dashboard -> Auth -> Third-party Auth: add Clerk issuer URL.
5. Run migrations in `supabase/migrations/` in order.
6. Seed season + castaways (Season 50 by default).
7. Populate `.env.local` from `.env.example`.
8. Optional for admin emails: configure SMTP + `APP_BASE_URL` + `EMAIL_FROM`.
9. Run `npm run dev`.

## Notes

- Keep service-role usage on server routes only.
- Prefer authz checks before every write, even with service role.
- When updating scoring/security behavior, update both README and this file.
