import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  league_id: z.string().uuid(),
  recipient_member_id: z.string().uuid(),
});

const TRASH_TALK_BANK = [
  "Your torch is basically a candle at this point.",
  "You brought a snorkel to a fire challenge.",
  "I have seen sturdier alliances in a coconut husk.",
  "You are playing chess like it is checkers, badly.",
  "Your blindside radar is set to airplane mode.",
  "Even Jeff would call that move questionable.",
  "You are one immunity idol away from total chaos.",
  "Your strategy has more holes than a fishing net.",
  "You are at Ponderosa in spirit already.",
  "I would say outwit, outplay, outlast, but you skipped step one.",
] as const;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { league_id, recipient_member_id } = parsed.data;
  const supabase = createServiceClient();

  const { data: senderMember } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league_id)
    .eq("profile_id", userId)
    .single();

  if (!senderMember) return NextResponse.json({ error: "Not authorized for this league" }, { status: 403 });
  if (senderMember.id === recipient_member_id) return NextResponse.json({ error: "Cannot trash talk yourself" }, { status: 400 });

  const { data: recipientMember } = await supabase
    .from("league_members")
    .select("id, profiles(display_name), tribe_name")
    .eq("id", recipient_member_id)
    .eq("league_id", league_id)
    .single();

  if (!recipientMember) return NextResponse.json({ error: "Recipient not found in this league" }, { status: 404 });

  const { count: sentCount, error: countError } = await supabase
    .from("trash_talk_messages")
    .select("id", { count: "exact", head: true })
    .eq("league_id", league_id)
    .eq("sender_member_id", senderMember.id);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const message = TRASH_TALK_BANK[(sentCount ?? 0) % TRASH_TALK_BANK.length];

  const { error: insertError } = await supabase
    .from("trash_talk_messages")
    .insert({
      league_id,
      sender_member_id: senderMember.id,
      recipient_member_id,
      message,
    });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const recipientName = (recipientMember as any).tribe_name ?? (recipientMember as any).profiles?.display_name ?? "player";
  return NextResponse.json({ ok: true, message, recipient_name: recipientName });
}
