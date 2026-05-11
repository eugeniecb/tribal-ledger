import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  member_id: z.string().uuid(),
  league_id: z.string().uuid(),
  rankings: z.array(z.object({ castaway_id: z.string().uuid(), rank: z.number().int().min(1) })),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const supabase = createServiceClient();

  // Verify ownership of member row
  const { data: member } = await supabase
    .from("league_members")
    .select("id, league_id")
    .eq("id", parsed.data.member_id)
    .eq("league_id", parsed.data.league_id)
    .eq("profile_id", userId)
    .single();

  if (!member) return NextResponse.json({ error: "Not authorized for this member" }, { status: 403 });

  const castawayIds = parsed.data.rankings.map((r) => r.castaway_id);
  if (new Set(castawayIds).size !== castawayIds.length) {
    return NextResponse.json({ error: "Duplicate castaways in rankings" }, { status: 400 });
  }
  const ranks = parsed.data.rankings.map((r) => r.rank);
  if (new Set(ranks).size !== ranks.length) {
    return NextResponse.json({ error: "Duplicate ranks in rankings" }, { status: 400 });
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("season_id")
    .eq("id", member.league_id)
    .single();

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: validCastaways } = await supabase
    .from("castaways")
    .select("id")
    .eq("season_id", league.season_id)
    .in("id", castawayIds);

  if ((validCastaways ?? []).length !== castawayIds.length) {
    return NextResponse.json({ error: "One or more castaways are not valid for this league season" }, { status: 400 });
  }

  // Delete existing rankings and re-insert
  await supabase.from("preference_rankings").delete().eq("member_id", parsed.data.member_id);

  const rows = parsed.data.rankings.map((r) => ({
    member_id: parsed.data.member_id,
    castaway_id: r.castaway_id,
    rank: r.rank,
  }));

  const { error } = await supabase.from("preference_rankings").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
