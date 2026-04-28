# Project Proposal: Tribal Ledger

## One-Line Description
A private Survivor fantasy league web app for friend groups who want weekly wagers, auto-assigned castaway teams, and automated episode scoring — without the hassle of spreadsheets.

## The Problem
Survivor fantasy leagues are fun but hard to run well. Scoring requires manual episode tracking, spreadsheets, and rules that don't always match how a specific friend group wants to play. Existing sites like fantasysurvivorgame.com have fixed rules and a public format that doesn't fit a private group dynamic. This project creates a flexible private-league experience where the scoring, wager structure, and rules are fully custom.

## Target User
A friend group that watches Survivor together or follows the season week by week and wants a lightweight private league to make each episode more competitive.

## Core Features (v1)
- Create or join a private league by invite code.
- Rank castaways by preference; app auto-assigns 2 castaways per player using a fairness-first algorithm.
- Submit weekly wagers before each episode: split a 10-point free budget across expected vote-outs, plus risk previously earned points for a doubled return.
- Maintain a Sole Survivor pick that can be changed any time — but the later you pick, the smaller the payout.
- Import episode results by scraping fantasysurvivorgame.com, generate a score draft, and let the league admin review and approve it before points apply.

## Tech Stack
- Frontend: Next.js (App Router), because the app needs dashboard pages, API routes, and Vercel deployment.
- Styling: Tailwind CSS v4, for a clean utility-first workflow.
- Database: Supabase Postgres with RLS, because the app needs relational data (leagues, members, wagers, castaways, score drafts) with per-user row-level security.
- Auth: Clerk with native Supabase JWT integration, so Clerk-issued tokens are accepted directly by Supabase RLS without a separate sync layer.
- APIs: fantasysurvivorgame.com recap pages as the episode-fact source, parsed with Cheerio.
- Deployment: Vercel, for seamless Next.js hosting and scheduled cron jobs for weekly episode imports.
- MCP Servers: Supabase MCP for database and schema work; Playwright MCP for browser testing and visual verification.

## Stretch Goals
- Multi-season support and reusable league templates.
- Co-admin support — league owners can promote other members to admin.
- Publicly shareable (read-only) standings links.
- Wager history and per-member score breakdowns by episode.
- Email or push notifications when a new score draft is ready for admin review.
- Fallback recap source if fantasysurvivorgame.com format changes or posts late.
- Manual episode-fact correction UI before admin approval.

## Biggest Risk
The hardest part is reliable episode import. Recap pages can post late, change their HTML structure, or miss details that matter for scoring. The admin review step is essential — automated imports should save time, not silently apply wrong scores. The parser will need monitoring and updates across the season.

## Week 5 Goal
Demo a working Tribal Ledger with two real users in a league: both have ranked castaways and received auto-assigned teams, both have submitted a weekly wager, the episode import has run and produced a score draft, and the admin has approved it — with standings updating correctly based on castaway points and wager outcomes.
