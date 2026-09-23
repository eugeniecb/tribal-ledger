import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { assignLeague } from "@/lib/league-assignment";

export const runtime = "nodejs";

const schema = z.object({ leagueId: z.string().uuid() });

// Scheduled assignment run (e.g. Supabase pg_cron right before a premiere).
export async function POST(req: Request) {
  // Auth: CRON_SECRET is mandatory; fail closed if missing.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: CRON_SECRET is required" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { leagueId } = parsed.data;

  const supabase = createServiceClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("owner_id, archived_at")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (league.archived_at) return NextResponse.json({ error: "League is archived" }, { status: 409 });

  // Audit as the league owner, since actor_id references profiles.
  const result = await assignLeague(supabase, leagueId, league.owner_id);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "locked" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, hasDuplicates: result.hasDuplicates, count: result.count });
}
