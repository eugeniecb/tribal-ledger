import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { assignLeague } from "@/lib/league-assignment";

const schema = z.object({ leagueId: z.string().uuid() });

async function parseLeagueId(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    return parsed.success ? parsed.data.leagueId : null;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData().catch(() => null);
    const parsed = schema.safeParse({ leagueId: formData?.get("leagueId") });
    return parsed.success ? parsed.data.leagueId : null;
  }

  return null;
}

function isFormSubmission(req: Request): boolean {
  const contentType = req.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

function redirectToTeam(req: Request, leagueId: string, status: "ok" | "error" | "locked") {
  return NextResponse.redirect(new URL(`/l/${leagueId}/team?assignment=${status}`, req.url), 303);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const fromForm = isFormSubmission(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leagueId = await parseLeagueId(req);
  if (!leagueId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = createServiceClient();

  // Verify admin
  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId)
    .single();

  if (!myMember || myMember.role !== "owner") {
    return NextResponse.json({ error: "Must be league owner to run assignment" }, { status: 403 });
  }

  const result = await assignLeague(supabase, leagueId, userId);
  if (!result.ok) {
    if (fromForm) return redirectToTeam(req, leagueId, result.reason === "locked" ? "locked" : "error");
    const status = result.reason === "not_found" ? 404 : result.reason === "locked" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (fromForm) return redirectToTeam(req, leagueId, "ok");
  return NextResponse.json({ ok: true, hasDuplicates: result.hasDuplicates });
}
