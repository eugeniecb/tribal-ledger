import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  league_id: z.string().uuid(),
  recipient_member_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { league_id, recipient_member_id } = parsed.data;
  const supabase = createServiceClient();

  const { data: recipientMember } = await supabase
    .from("league_members")
    .select("id, profiles(display_name), tribe_name")
    .eq("id", recipient_member_id)
    .eq("league_id", league_id)
    .single();

  if (!recipientMember) return NextResponse.json({ error: "Recipient not found in this league" }, { status: 404 });

  const { data: message, error: sendError } = await supabase.rpc("send_trash_talk", {
    p_league_id: league_id,
    p_actor_id: userId,
    p_recipient_member_id: recipient_member_id,
  });
  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });

  const recipientName = (recipientMember as any).tribe_name ?? (recipientMember as any).profiles?.display_name ?? "player";
  return NextResponse.json({ ok: true, message, recipient_name: recipientName });
}
