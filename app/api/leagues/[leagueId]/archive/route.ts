import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId)
    .single();

  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Only league owners can archive leagues" }, { status: 403 });
  }

  const { error } = await supabase.rpc("archive_league", {
    p_league_id: leagueId,
    p_actor_id: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const acceptsJson = (req.headers.get("accept") || "").includes("application/json");
  if (acceptsJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
