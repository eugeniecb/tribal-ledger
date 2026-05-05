import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { runAssignment } from "@/lib/assignment";

const schema = z.object({ leagueId: z.string().uuid() });

async function parseLeagueId(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    return parsed.success ? parsed.data.leagueId : null;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData().catch(() => null);
    const parsed = schema.safeParse({ leagueId: formData?.get("leagueId") });
    return parsed.success ? parsed.data.leagueId : null;
  }

  return null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leagueId = await parseLeagueId(req);
  if (!leagueId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = createServiceClient();

  // Verify admin
  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId)
    .single();

  if (!myMember || myMember.role !== "owner") {
    return NextResponse.json({ error: "Must be league owner to run assignment" }, { status: 403 });
  }

  // Fetch data
  const { data: membersData } = await supabase
    .from("league_members")
    .select("id, profiles(display_name)")
    .eq("league_id", leagueId);

  const { data: league } = await supabase.from("leagues").select("season_id").eq("id", leagueId).single();
  const { data: castawaysData } = await supabase.from("castaways").select("id, name").eq("season_id", league!.season_id).eq("is_eliminated", false);
  const memberIds = (membersData ?? []).map((m: any) => m.id);
  const { data: rankingsData } = await supabase.from("preference_rankings").select("member_id, castaway_id, rank").in("member_id", memberIds);

  const result = runAssignment({
    members: (membersData ?? []).map((m: any) => ({ id: m.id, display_name: m.profiles?.display_name ?? m.id })),
    castaways: castawaysData ?? [],
    rankings: rankingsData ?? [],
  });

  // Delete existing, insert new
  await supabase.from("team_assignments").delete().in("member_id", memberIds);
  await supabase.from("team_assignments").insert(result.assignments);

  // Audit
  await supabase.from("admin_audit_log").insert({
    league_id: leagueId,
    actor_id: userId,
    action: "run_assignment",
    payload: { has_duplicates: result.hasDuplicates, count: result.assignments.length },
  });

  return NextResponse.json({ ok: true, hasDuplicates: result.hasDuplicates });
}
