import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { validateWager } from "@/lib/scoring";

const schema = z.object({
  member_id: z.string().uuid(),
  episode_number: z.number().int().min(1),
  available_vote_points: z.number().int().min(0),
  budget_allocations: z.record(z.string(), z.number().int().min(0)).default({}),
  extra_wagers: z.record(z.string(), z.number().int().min(0)).default({}),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { member_id, episode_number, available_vote_points, budget_allocations, extra_wagers } = parsed.data;

  const supabase = createServiceClient();

  // Verify ownership
  const { data: member } = await supabase
    .from("league_members")
    .select("id, league_id")
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
    .select("season_id, seasons(episode_lock_weekday, episode_lock_hour_et)")
    .eq("id", member.league_id)
    .single();

  const season: any = (league as any)?.seasons;
  if (season) {
    const lockWeekday = season.episode_lock_weekday ?? 3;
    const lockHourET = season.episode_lock_hour_et ?? 20;
    const now = new Date();
    const ET_OFFSET = -5;
    const nowET = new Date(now.getTime() + (ET_OFFSET - (now.getTimezoneOffset() / 60)) * 3600000);
    const target = new Date(nowET);
    target.setHours(lockHourET, 0, 0, 0);
    const diff = (lockWeekday - nowET.getDay() + 7) % 7;
    target.setDate(target.getDate() + (diff === 0 && nowET >= target ? 7 : diff));
    const lockUTC = new Date(target.getTime() - ET_OFFSET * 3600000);
    if (now >= lockUTC) {
      await supabase.from("weekly_wagers").update({ locked: true }).eq("member_id", member_id).eq("episode_number", episode_number);
      return NextResponse.json({ error: "Wagers are locked for this episode" }, { status: 409 });
    }
  }

  // Validate amounts
  const errors = validateWager(budget_allocations, extra_wagers, available_vote_points);
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
