import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  message_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const supabase = createServiceClient();

  const { data: msg } = await supabase
    .from("trash_talk_messages")
    .select("id, recipient_member_id")
    .eq("id", parsed.data.message_id)
    .single();
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const { data: recipientMember } = await supabase
    .from("league_members")
    .select("id")
    .eq("id", (msg as any).recipient_member_id)
    .eq("profile_id", userId)
    .maybeSingle();
  if (!recipientMember) {
    return NextResponse.json({ error: "Not allowed to dismiss this message" }, { status: 403 });
  }

  const { error } = await supabase
    .from("trash_talk_messages")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", parsed.data.message_id)
    .is("dismissed_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
