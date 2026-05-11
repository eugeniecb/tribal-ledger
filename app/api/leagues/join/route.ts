import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  invite_code: z.string().min(1).max(10),
  tribe_name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const supabase = createServiceClient();
  const user = await currentUser();

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: user?.firstName ?? user?.username ?? "Player",
    email: user?.emailAddresses?.[0]?.emailAddress ?? "",
  }, { onConflict: "id", ignoreDuplicates: true });

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, archived_at")
    .eq("invite_code", parsed.data.invite_code.toUpperCase())
    .maybeSingle();

  if (!league) return NextResponse.json({ error: "League not found. Check the invite code." }, { status: 404 });
  if (league.archived_at) return NextResponse.json({ error: "This league has been archived." }, { status: 409 });

  // Check if already a member
  const { data: existing } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) return NextResponse.json({ league_id: league.id }, { status: 200 });

  const { error } = await supabase.from("league_members").insert({
    league_id: league.id,
    profile_id: userId,
    tribe_name: parsed.data.tribe_name.trim(),
    role: "member",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ league_id: league.id }, { status: 201 });
}
