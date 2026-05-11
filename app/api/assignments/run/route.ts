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

function isFormSubmission(req: Request): boolean {
  const contentType = req.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

function redirectToTeam(req: Request, leagueId: string, status: "ok" | "error" | "locked") {
  return NextResponse.redirect(new URL(`/l/${leagueId}/team?assignment=${status}`, req.url), 303);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const fromForm = isFormSubmission(req);
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

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("season_id, assignment_locked_at")
    .eq("id", leagueId)
    .single();
  if (leagueError || !league) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: "League not found" }, { status: 404 });
  }
  if (league.assignment_locked_at) {
    return fromForm
      ? redirectToTeam(req, leagueId, "locked")
      : NextResponse.json({ error: "Assignment has already been finalized for this league" }, { status: 409 });
  }

  const { data: castawaysData, error: castawaysError } = await supabase
    .from("castaways")
    .select("id, name")
    .eq("season_id", league.season_id)
    .eq("is_eliminated", false);
  if (castawaysError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: castawaysError.message }, { status: 500 });
  }

  const memberIds = (membersData ?? []).map((m: any) => m.id);
  const { data: rankingsData, error: rankingsError } = await supabase
    .from("preference_rankings")
    .select("member_id, castaway_id, rank")
    .in("member_id", memberIds);
  if (rankingsError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: rankingsError.message }, { status: 500 });
  }

  const result = runAssignment({
    members: (membersData ?? []).map((m: any) => ({ id: m.id, display_name: m.profiles?.display_name ?? m.id })),
    castaways: castawaysData ?? [],
    rankings: rankingsData ?? [],
  });

  // Delete existing, insert new
  const { error: deleteError } = await supabase.from("team_assignments").delete().in("member_id", memberIds);
  if (deleteError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("team_assignments").insert(result.assignments);
  if (insertError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: lockError } = await supabase
    .from("leagues")
    .update({ assignment_locked_at: new Date().toISOString() })
    .eq("id", leagueId)
    .is("assignment_locked_at", null);
  if (lockError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: lockError.message }, { status: 500 });
  }

  // Audit
  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    league_id: leagueId,
    actor_id: userId,
    action: "run_assignment",
    payload: { has_duplicates: result.hasDuplicates, count: result.assignments.length },
  });
  if (auditError) {
    return fromForm ? redirectToTeam(req, leagueId, "error") : NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  if (fromForm) return redirectToTeam(req, leagueId, "ok");
  return NextResponse.json({ ok: true, hasDuplicates: result.hasDuplicates });
}
