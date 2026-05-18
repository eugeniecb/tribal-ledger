import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export async function POST(req: Request, { params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: CRON_SECRET is required" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!myMember || myMember.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const importUrl = `${url.origin}/api/jobs/import-episode-results`;
  const importRes = await fetch(importUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
    cache: "no-store",
  });

  const payload = await importRes.json().catch(() => ({}));
  if (!importRes.ok) {
    return NextResponse.json(
      { error: payload?.error ?? "Failed to import recaps" },
      { status: importRes.status }
    );
  }

  return NextResponse.json(payload);
}
