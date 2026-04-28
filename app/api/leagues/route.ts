import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserClient, createServiceClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().min(1).max(60) });

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Ensure profile exists
  await supabase.from("profiles").upsert({ id: userId, display_name: parsed.data.name, email: "" }, { onConflict: "id", ignoreDuplicates: true });

  // Get default season (latest)
  const { data: season } = await supabase.from("seasons").select("id").order("number", { ascending: false }).limit(1).single();
  if (!season) return NextResponse.json({ error: "No season configured" }, { status: 500 });

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from("leagues").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({ name: parsed.data.name, invite_code: inviteCode, season_id: season.id, owner_id: userId })
    .select("id, name, invite_code")
    .single();

  if (leagueError) return NextResponse.json({ error: leagueError.message }, { status: 500 });

  // Add creator as owner member
  await supabase.from("league_members").insert({
    league_id: league.id,
    profile_id: userId,
    role: "owner",
  });

  return NextResponse.json(league, { status: 201 });
}
