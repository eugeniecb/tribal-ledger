import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import AdminClient from "./AdminClient";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function AdminPage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();

  if (!myMember || myMember.role !== "owner") {
    redirect(`/l/${leagueId}`);
  }

  const { data: drafts } = await supabase
    .from("score_drafts")
    .select("id, status, created_at, approved_at, episode_imports(episode_number), deltas")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-2">Admin Panel</h1>
      <p className="text-jungle-mid text-sm mb-8">Review and approve weekly score drafts.</p>

      <AdminClient drafts={(drafts ?? []) as any[]} leagueId={leagueId} userId={userId!} />
    </div>
  );
}
