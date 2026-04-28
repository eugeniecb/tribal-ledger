import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify draft exists and user is admin of its league
  const { data: draft } = await supabase
    .from("score_drafts")
    .select("id, league_id, status")
    .eq("id", draftId)
    .single();

  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", draft.league_id)
    .eq("profile_id", userId)
    .single();

  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Must be league owner to approve drafts" }, { status: 403 });
  }

  // Invoke atomic RPC
  const { error } = await supabase.rpc("approve_score_draft", {
    p_draft_id: draftId,
    p_approver: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
