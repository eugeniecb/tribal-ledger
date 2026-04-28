import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  member_id: z.string().uuid(),
  castaway_id: z.string().uuid(),
  episode_number: z.number().int().min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const { member_id, castaway_id, episode_number } = parsed.data;
  const supabase = createServiceClient();

  // Verify ownership
  const { data: member } = await supabase
    .from("league_members")
    .select("id")
    .eq("id", member_id)
    .eq("profile_id", userId)
    .single();

  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Castaway must not be eliminated
  const { data: castaway } = await supabase
    .from("castaways")
    .select("is_eliminated")
    .eq("id", castaway_id)
    .single();

  if (!castaway) return NextResponse.json({ error: "Castaway not found" }, { status: 404 });
  if (castaway.is_eliminated) return NextResponse.json({ error: "This castaway has been eliminated" }, { status: 409 });

  // Deactivate previous pick
  await supabase.from("sole_survivor_picks").update({ active: false }).eq("member_id", member_id).eq("active", true);

  // Insert new active pick
  const { error } = await supabase.from("sole_survivor_picks").insert({
    member_id,
    castaway_id,
    selected_at_episode: episode_number,
    active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
