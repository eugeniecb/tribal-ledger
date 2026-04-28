import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SoleSurvivorClient from "./SoleSurvivorClient";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function SoleSurvivorPage({ params }: Props) {
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
    .select("season_id, seasons(total_episodes)")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const { data: castaways } = await supabase
    .from("castaways")
    .select("id, name, image_url, tribe, is_eliminated")
    .eq("season_id", league.season_id)
    .order("name");

  // Current active pick
  const { data: activePick } = await supabase
    .from("sole_survivor_picks")
    .select("castaway_id, selected_at_episode")
    .eq("member_id", myMember.id)
    .eq("active", true)
    .maybeSingle();

  // Current episode (next after latest import)
  const { data: latestImport } = await supabase
    .from("episode_imports")
    .select("episode_number")
    .eq("season_id", league.season_id)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentEpisode = (latestImport?.episode_number ?? 0) + 1;
  const totalEpisodes: number = (league as any).seasons?.total_episodes ?? 13;
  const potentialPoints = totalEpisodes - currentEpisode + 1;

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-2">Sole Survivor Pick</h1>
      <p className="text-jungle-mid text-sm mb-2">
        Pick who wins the whole season. Change any time — but your payout shrinks each episode.
      </p>
      <p className="text-sm text-jungle-mid mb-8">
        Pick now (episode {currentEpisode}) → <strong>{potentialPoints} pts</strong> if correct
      </p>

      <SoleSurvivorClient
        memberId={myMember.id}
        castaways={(castaways ?? []) as any[]}
        activeCastawayId={activePick?.castaway_id ?? null}
        currentEpisode={currentEpisode}
        totalEpisodes={totalEpisodes}
      />
    </div>
  );
}
