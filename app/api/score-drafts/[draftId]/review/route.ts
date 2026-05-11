import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { parseLeagueRuleSet, EVENT_KEYS } from "@/lib/rules";
import { scoreEpisodeCastaways, settleWager } from "@/lib/scoring";
import type { EpisodeFacts, MemberDelta } from "@/lib/types";

const schema = z.object({
  votedOutNames: z.array(z.string().min(1)).default([]),
  events: z.array(z.object({
    castawayName: z.string().min(1),
    eventKey: z.enum(EVENT_KEYS),
    sourcePoints: z.number().int().optional(),
  })).default([]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const supabase = createServiceClient();

  const { data: draft } = await supabase
    .from("score_drafts")
    .select("id, league_id, status, episode_import_id")
    .eq("id", draftId)
    .single();
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status === "approved") return NextResponse.json({ error: "Approved drafts cannot be edited" }, { status: 409 });

  const { data: adminMember } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", draft.league_id)
    .eq("profile_id", userId)
    .single();
  if (!adminMember || adminMember.role !== "owner") {
    return NextResponse.json({ error: "Must be league owner to edit drafts" }, { status: 403 });
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("season_id, rule_set")
    .eq("id", draft.league_id)
    .single();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: episodeImport } = await supabase
    .from("episode_imports")
    .select("id, episode_number, source_url")
    .eq("id", draft.episode_import_id)
    .single();
  if (!episodeImport) return NextResponse.json({ error: "Episode import not found" }, { status: 404 });

  const rules = parseLeagueRuleSet((league as any).rule_set);
  const facts: EpisodeFacts = {
    episodeNumber: episodeImport.episode_number,
    votedOutNames: parsed.data.votedOutNames,
    events: parsed.data.events.map((e) => ({
      castawayName: e.castawayName.trim(),
      eventKey: e.eventKey,
      sourcePoints: e.sourcePoints ?? 0,
    })),
  };

  const { data: castaways } = await supabase
    .from("castaways")
    .select("*")
    .eq("season_id", league.season_id);
  const { data: members } = await supabase
    .from("league_members")
    .select("*")
    .eq("league_id", draft.league_id);
  const memberIds = (members ?? []).map((m: any) => m.id);

  const [{ data: assignments }, { data: wagers }] = await Promise.all([
    supabase.from("team_assignments").select("*").in("member_id", memberIds),
    rules.wagers_enabled
      ? supabase
          .from("weekly_wagers")
          .select("*")
          .in("member_id", memberIds)
          .eq("episode_number", episodeImport.episode_number)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const castawayDeltas = scoreEpisodeCastaways(
    facts,
    (castaways ?? []) as any,
    (members ?? []) as any,
    (assignments ?? []) as any,
    rules.event_points
  );

  const wagerDeltas: MemberDelta[] = [];
  for (const wager of wagers ?? []) {
    const member = (members ?? []).find((m: any) => m.id === wager.member_id);
    if (!member) continue;
    const delta = settleWager({
      member: member as any,
      wager: wager as any,
      votedOutNames: facts.votedOutNames,
      castaways: (castaways ?? []) as any,
      winMultiplier: rules.extra_wager_win_multiplier,
    });
    wagerDeltas.push(delta);
  }

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

  const { error: importUpdateError } = await supabase
    .from("episode_imports")
    .update({ raw_facts: facts as any, source_url: episodeImport.source_url })
    .eq("id", episodeImport.id);
  if (importUpdateError) return NextResponse.json({ error: importUpdateError.message }, { status: 500 });

  const { error: draftUpdateError } = await supabase
    .from("score_drafts")
    .update({
      deltas: mergedDeltas as any,
      status: "pending",
      approved_at: null,
      approved_by: null,
    })
    .eq("id", draft.id);
  if (draftUpdateError) return NextResponse.json({ error: draftUpdateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, deltas: mergedDeltas });
}
