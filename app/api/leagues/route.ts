import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_LEAGUE_RULE_SET, leagueRuleSetSchema } from "@/lib/rules";

const schema = z.object({
  name: z.string().min(1).max(60),
  tribe_name: z.string().min(1).max(60),
  rule_set: leagueRuleSetSchema.optional(),
});

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getOrCreateDefaultSeasonId(supabase: ReturnType<typeof createServiceClient>) {
  const { data: latestSeason, error: latestError } = await supabase
    .from("seasons")
    .select("id")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { id: null, error: latestError.message };
  if (latestSeason?.id) return { id: latestSeason.id, error: null };

  const seasonNumber = parseInt(process.env.FSG_SEASON_NUMBER ?? "50", 10);
  const recapUrl = process.env.FSG_RECAP_URL ?? "https://www.fantasysurvivorgame.com/episode-recap/season/50";

  const { data: createdSeason, error: createError } = await supabase
    .from("seasons")
    .insert({
      number: seasonNumber,
      name: `Survivor ${seasonNumber}`,
      total_episodes: 13,
      fsg_recap_url: recapUrl,
      episode_lock_weekday: 3,
      episode_lock_hour_et: 20,
    })
    .select("id")
    .single();

  if (createError) return { id: null, error: createError.message };

  return { id: createdSeason.id, error: null };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await currentUser();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const ruleSet = parsed.data.rule_set ?? DEFAULT_LEAGUE_RULE_SET;

  const supabase = createServiceClient();

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: user?.firstName ?? user?.username ?? user?.emailAddresses?.[0]?.emailAddress ?? "Player",
    email: user?.emailAddresses?.[0]?.emailAddress ?? "",
  }, { onConflict: "id" });

  // Get default season (latest), or bootstrap one for fresh installs.
  const { id: seasonId, error: seasonError } = await getOrCreateDefaultSeasonId(supabase);
  if (!seasonId) {
    return NextResponse.json(
      { error: seasonError ?? "No season configured" },
      { status: 500 }
    );
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from("leagues").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name: parsed.data.name,
      invite_code: inviteCode,
      season_id: seasonId,
      owner_id: userId,
      rule_set: ruleSet,
    })
    .select("id, name, invite_code")
    .single();

  if (leagueError) return NextResponse.json({ error: leagueError.message }, { status: 500 });

  // Add creator as owner member
  const { error: memberInsertError } = await supabase.from("league_members").insert({
    league_id: league.id,
    profile_id: userId,
    tribe_name: parsed.data.tribe_name.trim(),
    role: "owner",
  });

  if (memberInsertError) {
    await supabase.from("leagues").delete().eq("id", league.id);
    return NextResponse.json({ error: `Failed to create owner membership: ${memberInsertError.message}` }, { status: 500 });
  }

  return NextResponse.json(league, { status: 201 });
}
