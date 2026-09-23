import type { createServiceClient } from "@/lib/supabase/server";
import { runAssignment } from "@/lib/assignment";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type LeagueAssignmentResult =
  | { ok: true; hasDuplicates: boolean; count: number }
  | { ok: false; reason: "not_found" | "locked" | "error"; error: string };

// Runs the fairness assignment for a league, stores teams, locks the league, and audits.
// Callers are responsible for authz (owner check or CRON_SECRET) before calling this.
export async function assignLeague(
  supabase: ServiceClient,
  leagueId: string,
  actorId: string
): Promise<LeagueAssignmentResult> {
  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("season_id, assignment_locked_at")
    .eq("id", leagueId)
    .single();
  if (leagueError || !league) return { ok: false, reason: "not_found", error: "League not found" };
  if (league.assignment_locked_at) {
    return { ok: false, reason: "locked", error: "Assignment has already been finalized for this league" };
  }

  const { data: membersData, error: membersError } = await supabase
    .from("league_members")
    .select("id, profiles(display_name)")
    .eq("league_id", leagueId);
  if (membersError) return { ok: false, reason: "error", error: membersError.message };

  const { data: castawaysData, error: castawaysError } = await supabase
    .from("castaways")
    .select("id, name")
    .eq("season_id", league.season_id)
    .eq("is_eliminated", false);
  if (castawaysError) return { ok: false, reason: "error", error: castawaysError.message };

  const memberIds = (membersData ?? []).map((m: any) => m.id);
  const { data: rankingsData, error: rankingsError } = await supabase
    .from("preference_rankings")
    .select("member_id, castaway_id, rank")
    .in("member_id", memberIds);
  if (rankingsError) return { ok: false, reason: "error", error: rankingsError.message };

  const result = runAssignment({
    members: (membersData ?? []).map((m: any) => ({ id: m.id, display_name: m.profiles?.display_name ?? m.id })),
    castaways: castawaysData ?? [],
    rankings: rankingsData ?? [],
  });

  // Delete existing, insert new
  const { error: deleteError } = await supabase.from("team_assignments").delete().in("member_id", memberIds);
  if (deleteError) return { ok: false, reason: "error", error: deleteError.message };

  const { error: insertError } = await supabase.from("team_assignments").insert(result.assignments);
  if (insertError) return { ok: false, reason: "error", error: insertError.message };

  const { error: lockError } = await supabase
    .from("leagues")
    .update({ assignment_locked_at: new Date().toISOString() })
    .eq("id", leagueId)
    .is("assignment_locked_at", null);
  if (lockError) return { ok: false, reason: "error", error: lockError.message };

  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    league_id: leagueId,
    actor_id: actorId,
    action: "run_assignment",
    payload: { has_duplicates: result.hasDuplicates, count: result.assignments.length },
  });
  if (auditError) return { ok: false, reason: "error", error: auditError.message };

  return { ok: true, hasDuplicates: result.hasDuplicates, count: result.assignments.length };
}
