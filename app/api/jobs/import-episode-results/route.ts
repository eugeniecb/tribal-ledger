import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAndParseFSG } from "@/lib/fsg-parser";
import { scoreEpisodeCastaways, settleWager } from "@/lib/scoring";
import type { Castaway, LeagueMember, TeamAssignment, WeeklyWager, EpisodeFacts, MemberDelta } from "@/lib/types";
import { parseLeagueRuleSet } from "@/lib/rules";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Auth: require CRON_SECRET in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const fsgUrl = process.env.FSG_RECAP_URL ?? "https://www.fantasysurvivorgame.com/episode-recap/season/50";
  const seasonNumber = parseInt(process.env.FSG_SEASON_NUMBER ?? "50", 10);

  let episodes;
  try {
    episodes = await fetchAndParseFSG(fsgUrl);
  } catch (err: any) {
    return NextResponse.json({ error: `FSG fetch failed: ${err.message}` }, { status: 502 });
  }

  if (!episodes.length) {
    return NextResponse.json({ message: "No episodes parsed" });
  }

  // Use highest episode number found
  const latest = episodes.reduce((best, ep) => ep.episodeNumber > best.episodeNumber ? ep : best, episodes[0]);

  // Dry run if no service credentials
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ dry_run: true, parsed: latest });
  }

  const supabase = createServiceClient();

  // Upsert season
  const { data: season } = await supabase
    .from("seasons")
    .select("id, total_episodes")
    .eq("number", seasonNumber)
    .maybeSingle();

  if (!season) {
    return NextResponse.json({ error: `Season ${seasonNumber} not found in database` }, { status: 404 });
  }

  // Upsert episode import
  const { data: importRow, error: importError } = await supabase
    .from("episode_imports")
    .upsert({
      season_id: season.id,
      episode_number: latest.episodeNumber,
      raw_facts: latest as any,
      source_url: fsgUrl,
      imported_at: new Date().toISOString(),
    }, { onConflict: "season_id,episode_number" })
    .select("id")
    .single();

  if (importError) return NextResponse.json({ error: importError.message }, { status: 500 });

  // Fetch all castaways for this season
  const { data: castaways } = await supabase.from("castaways").select("*").eq("season_id", season.id);

  // Mark voted-out castaways as eliminated
  for (const name of latest.votedOutNames) {
    const castaway = (castaways ?? []).find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    if (castaway && !castaway.is_eliminated) {
      await supabase.from("castaways").update({ is_eliminated: true, eliminated_episode: latest.episodeNumber }).eq("id", castaway.id);
    }
  }

  // Fetch all leagues for this season
  const { data: leagues } = await supabase.from("leagues").select("id, rule_set").eq("season_id", season.id);

  const results = [];

  for (const league of leagues ?? []) {
    const rules = parseLeagueRuleSet((league as any).rule_set);
    // Skip if draft already exists for this import + league
    const { data: existingDraft } = await supabase
      .from("score_drafts")
      .select("id, status")
      .eq("league_id", league.id)
      .eq("episode_import_id", importRow.id)
      .maybeSingle();

    if (existingDraft?.status === "approved") {
      results.push({ league_id: league.id, skipped: "already_approved" });
      continue;
    }

    // Fetch members, assignments, wagers
    const { data: members } = await supabase
      .from("league_members")
      .select("*")
      .eq("league_id", league.id);

    const memberIds = (members ?? []).map((m: any) => m.id);

    const [{ data: assignments }, { data: wagers }] = await Promise.all([
      supabase.from("team_assignments").select("*").in("member_id", memberIds),
      rules.wagers_enabled
        ? supabase.from("weekly_wagers")
            .select("*")
            .in("member_id", memberIds)
            .eq("episode_number", latest.episodeNumber)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    // Score castaways
    const castawayDeltas = scoreEpisodeCastaways(
      latest as EpisodeFacts,
      (castaways ?? []) as Castaway[],
      (members ?? []) as LeagueMember[],
      (assignments ?? []) as TeamAssignment[],
      rules.event_points
    );

    // Settle wagers
    const wagerDeltas: MemberDelta[] = [];
    for (const wager of wagers ?? []) {
      const member = (members ?? []).find((m: any) => m.id === wager.member_id);
      if (!member) continue;
      const delta = settleWager({
        member: member as LeagueMember,
        wager: wager as WeeklyWager,
        votedOutNames: latest.votedOutNames,
        castaways: (castaways ?? []) as Castaway[],
        winMultiplier: rules.extra_wager_win_multiplier,
      });
      wagerDeltas.push(delta);
    }

    // Merge deltas by member
    const deltaMap = new Map<string, MemberDelta>();
    for (const delta of [...castawayDeltas, ...wagerDeltas]) {
      const existing = deltaMap.get(delta.memberId);
      if (existing) {
        existing.deltaCastawayPoints += delta.deltaCastawayPoints;
        existing.deltaVotePoints += delta.deltaVotePoints;
        existing.breakdown.push(...delta.breakdown);
      } else {
        deltaMap.set(delta.memberId, { ...delta, breakdown: [...delta.breakdown] });
      }
    }

    const mergedDeltas = Array.from(deltaMap.values());

    // Upsert score draft
    const { error: draftError } = await supabase.from("score_drafts").upsert({
      ...(existingDraft?.id ? { id: existingDraft.id } : {}),
      league_id: league.id,
      episode_import_id: importRow.id,
      status: "pending",
      deltas: mergedDeltas as any,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    results.push({ league_id: league.id, error: draftError?.message, deltas: mergedDeltas.length });
  }

  return NextResponse.json({ episode: latest.episodeNumber, leagues: results.length, results });
}
