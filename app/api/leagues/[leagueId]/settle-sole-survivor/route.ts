import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { scoreSoleSurvivor } from "@/lib/scoring";
import type { SoleSurvivorPick, MemberDelta } from "@/lib/types";

const schema = z.object({
  castaway_id: z.string().uuid(),
});

interface Params {
  params: Promise<{ leagueId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const { leagueId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { castaway_id: winnerId } = parsed.data;

  const supabase = createServiceClient();

  // Verify caller is league owner
  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!myMember || myMember.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch league + season
  const { data: league } = await supabase
    .from("leagues")
    .select("season_id, rule_set, seasons(total_episodes)")
    .eq("id", leagueId)
    .single();

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const totalEpisodes = (league as any).seasons?.total_episodes as number | undefined;
  if (!totalEpisodes) return NextResponse.json({ error: "Season total_episodes not set" }, { status: 400 });

  // Guard against double-settlement: reject if any approved draft for this league already
  // contains a sole_survivor breakdown item
  const { data: existingDrafts } = await supabase
    .from("score_drafts")
    .select("id, status, deltas")
    .eq("league_id", leagueId);

  const alreadySettled = (existingDrafts ?? []).some((d) =>
    d.status === "approved" &&
    (d.deltas as MemberDelta[]).some((delta) =>
      delta.breakdown.some((b) => b.source === "sole_survivor")
    )
  );
  if (alreadySettled) {
    return NextResponse.json({ error: "Sole Survivor has already been settled for this league" }, { status: 409 });
  }

  // Verify winner castaway exists and belongs to this season
  const { data: winnerCastaway } = await supabase
    .from("castaways")
    .select("id, name")
    .eq("id", winnerId)
    .eq("season_id", league.season_id)
    .maybeSingle();

  if (!winnerCastaway) {
    return NextResponse.json({ error: "Winner castaway not found in this league's season" }, { status: 400 });
  }

  // Fetch latest episode import for this season (required as FK for score_draft)
  const { data: latestImport } = await supabase
    .from("episode_imports")
    .select("id")
    .eq("season_id", league.season_id)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestImport) {
    return NextResponse.json({ error: "No episode imports found — run the cron import first" }, { status: 400 });
  }

  // Fetch all active sole survivor picks for this league's members
  const { data: members } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId);

  const memberIds = (members ?? []).map((m: any) => m.id);

  const { data: picks } = await supabase
    .from("sole_survivor_picks")
    .select("*")
    .in("member_id", memberIds)
    .eq("active", true);

  // Score each pick
  const deltas: MemberDelta[] = (picks ?? []).map((pick) =>
    scoreSoleSurvivor(pick as SoleSurvivorPick, winnerId, totalEpisodes)
  );

  // Upsert the draft — replace any existing pending sole-survivor draft for this import
  const pendingExisting = (existingDrafts ?? []).find(
    (d) =>
      d.status === "pending" &&
      (d.deltas as MemberDelta[]).some((delta) =>
        delta.breakdown.some((b) => b.source === "sole_survivor")
      )
  );

  const { data: draft, error: draftError } = await supabase
    .from("score_drafts")
    .upsert(
      {
        ...(pendingExisting ? { id: pendingExisting.id } : {}),
        league_id: leagueId,
        episode_import_id: latestImport.id,
        status: "pending",
        deltas: deltas as any,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });

  return NextResponse.json({ ok: true, draft_id: draft.id, winner: winnerCastaway.name, picks: picks?.length ?? 0 });
}
