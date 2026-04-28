import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RankingClient from "./RankingClient";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function RankPage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  const { data: myMember } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();

  if (!myMember) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("season_id")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const [{ data: castaways }, { data: savedRankings }] = await Promise.all([
    supabase
      .from("castaways")
      .select("id, name, image_url, tribe, is_eliminated")
      .eq("season_id", league.season_id)
      .order("name"),
    supabase
      .from("preference_rankings")
      .select("castaway_id, rank")
      .eq("member_id", myMember.id)
      .order("rank"),
  ]);

  // Merge: apply saved order, append any not-yet-ranked castaways
  const rankedIds = new Set((savedRankings ?? []).map((r: any) => r.castaway_id));
  const orderedIds: string[] = [
    ...(savedRankings ?? []).map((r: any) => r.castaway_id),
    ...(castaways ?? []).filter((c: any) => !rankedIds.has(c.id)).map((c: any) => c.id),
  ];
  const castawayMap = new Map((castaways ?? []).map((c: any) => [c.id, c]));
  const initialOrder = orderedIds.map((id) => castawayMap.get(id)).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-2">Castaway Rankings</h1>
      <p className="text-jungle-mid text-sm mb-8">
        Drag to rank castaways by preference. The algorithm uses this to assign your 2-castaway team. Save when done.
      </p>
      <RankingClient
        initialOrder={initialOrder as any[]}
        memberId={myMember.id}
        leagueId={leagueId}
      />
    </div>
  );
}
