import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { validateWager } from "@/lib/scoring";
import { parseLeagueRuleSet } from "@/lib/rules";

const schema = z.object({
  member_id: z.string().uuid(),
  episode_number: z.number().int().min(1),
  budget_allocations: z.record(z.string(), z.number().int().min(0)).default({}),
  extra_wagers: z.record(z.string(), z.number().int().min(0)).default({}),
});

function getEtParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekday ? weekdayMap[weekday] : 0,
    hour,
    minute,
  };
}

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

  const season: any = (league as any)?.seasons;
  if (season) {
    const lockWeekday = season.episode_lock_weekday ?? 3;
    const lockHourET = season.episode_lock_hour_et ?? 20;
    const nowEt = getEtParts(new Date());
    const isLocked =
      nowEt.weekday > lockWeekday ||
      (nowEt.weekday === lockWeekday &&
        (nowEt.hour > lockHourET || (nowEt.hour === lockHourET && nowEt.minute >= 0)));
    if (isLocked) {
      await supabase.from("weekly_wagers").update({ locked: true }).eq("member_id", member_id).eq("episode_number", episode_number);
      return NextResponse.json({ error: "Wagers are locked for this episode" }, { status: 409 });
    }
  }

  // Validate amounts
  const availableVotePoints = Math.max(0, member.vote_points ?? 0);
  const errors = validateWager(budget_allocations, extra_wagers, availableVotePoints, rules.weekly_wager_budget);
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
