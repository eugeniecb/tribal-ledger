import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { validateWager } from "@/lib/scoring";
import { parseLeagueRuleSet } from "@/lib/rules";
import { isWagerLocked } from "@/lib/wager-lock";

const schema = z.object({
  member_id: z.string().uuid(),
  episode_number: z.number().int().min(1),
  budget_allocations: z.record(z.string(), z.number().int().min(0)).default({}),
  extra_wagers: z.record(z.string(), z.number().int().min(0)).default({}),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { member_id, episode_number, budget_allocations, extra_wagers } = parsed.data;

  const supabase = createServiceClient();

  // Verify ownership
  const { data: member } = await supabase
    .from("league_members")
    .select("id, league_id, vote_points")
    .eq("id", member_id)
    .eq("profile_id", userId)
    .single();

  if (!member) return NextResponse.json({ error: "Not authorized for this member" }, { status: 403 });

  // Check wager not locked
  const { data: existing } = await supabase
    .from("weekly_wagers")
    .select("locked")
    .eq("member_id", member_id)
    .eq("episode_number", episode_number)
    .maybeSingle();

  if (existing?.locked) return NextResponse.json({ error: "Wagers are locked for this episode" }, { status: 409 });

  // Check lock time server-side
  const { data: league } = await supabase
    .from("leagues")
    .select("season_id, rule_set, seasons(episode_lock_weekday, episode_lock_hour_et)")
    .eq("id", member.league_id)
    .single();

  const rules = parseLeagueRuleSet((league as any)?.rule_set);
  if (!rules.wagers_enabled) {
    return NextResponse.json({ error: "Wagers are disabled for this league" }, { status: 409 });
  }

  // Only the upcoming episode (latest import + 1) accepts wagers.
  const { data: latestImport } = await supabase
    .from("episode_imports")
    .select("episode_number, imported_at")
    .eq("season_id", (league as any)?.season_id)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentEpisode = (latestImport?.episode_number ?? 0) + 1;
  if (episode_number !== currentEpisode) {
    return NextResponse.json({ error: `Wagers are only open for episode ${currentEpisode}` }, { status: 409 });
  }

  const season: any = (league as any)?.seasons;
  if (season) {
    const isLocked = isWagerLocked({
      now: new Date(),
      lockWeekday: season.episode_lock_weekday ?? 3,
      lockHourET: season.episode_lock_hour_et ?? 20,
      latestImportAt: latestImport?.imported_at ? new Date(latestImport.imported_at) : null,
    });
    if (isLocked) {
      await supabase.from("weekly_wagers").update({ locked: true }).eq("member_id", member_id).eq("episode_number", episode_number);
      return NextResponse.json({ error: "Wagers are locked for this episode" }, { status: 409 });
    }
  }

  // Wagers can only target castaways still in the game; the free budget applies per current tribe.
  const { data: activeCastaways, error: castawaysError } = await supabase
    .from("castaways")
    .select("id, tribe")
    .eq("season_id", (league as any)?.season_id)
    .eq("is_eliminated", false);
  if (castawaysError) return NextResponse.json({ error: castawaysError.message }, { status: 500 });
  const tribeByCastawayId: Record<string, string | null> = Object.fromEntries(
    (activeCastaways ?? []).map((c: any) => [c.id, c.tribe])
  );
  const unknownIds = [...Object.keys(budget_allocations), ...Object.keys(extra_wagers)].filter(
    (id) => !(id in tribeByCastawayId)
  );
  if (unknownIds.length) {
    return NextResponse.json({ error: "Wagers can only be placed on castaways still in the game" }, { status: 422 });
  }

  // Validate amounts
  const availableVotePoints = Math.max(0, member.vote_points ?? 0);
  const errors = validateWager(budget_allocations, extra_wagers, availableVotePoints, rules.weekly_wager_budget, tribeByCastawayId);
  if (errors.length > 0) return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });

  // Upsert
  const { error: upsertError } = await supabase.from("weekly_wagers").upsert({
    member_id,
    episode_number,
    budget_allocations,
    extra_wagers,
    submitted_at: new Date().toISOString(),
    locked: false,
  }, { onConflict: "member_id,episode_number" });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
