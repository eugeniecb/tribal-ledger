import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WagerClient from "./WagerClient";

interface Props {
  params: Promise<{ leagueId: string }>;
}

// Episode number is derived from the latest episode import, or defaults to 1
async function getCurrentEpisodeNumber(supabase: any, seasonId: string): Promise<number> {
  const { data } = await supabase
    .from("episode_imports")
    .select("episode_number")
    .eq("season_id", seasonId)
    .order("episode_number", { ascending: false })
    .limit(1);
  return (data?.[0]?.episode_number ?? 0) + 1;
}

export default async function WagerPage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, vote_points")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();

  if (!myMember) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("season_id, seasons(total_episodes, episode_lock_weekday, episode_lock_hour_et)")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const episodeNumber = await getCurrentEpisodeNumber(supabase, league.season_id);

  const { data: castaways } = await supabase
    .from("castaways")
    .select("id, name, image_url, tribe, is_eliminated")
    .eq("season_id", league.season_id)
    .eq("is_eliminated", false)
    .order("name");

  const { data: existingWager } = await supabase
    .from("weekly_wagers")
    .select("budget_allocations, extra_wagers, locked")
    .eq("member_id", myMember.id)
    .eq("episode_number", episodeNumber)
    .maybeSingle();

  const season: any = (league as any).seasons;
  const lockWeekday = season?.episode_lock_weekday ?? 3;
  const lockHourET = season?.episode_lock_hour_et ?? 20;

  // Calculate lock time for current week (next occurrence of lockWeekday at lockHourET ET)
  const now = new Date();
  const lockDateUTC = getNextWeekdayET(lockWeekday, lockHourET, now);
  const isLocked = existingWager?.locked || now >= lockDateUTC;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-2">Episode {episodeNumber} Wager</h1>
      <p className="text-jungle-mid text-sm mb-1">
        Locks: {lockDateUTC.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
      </p>
      <p className="text-jungle-mid text-sm mb-8">
        Your available vote points: <strong>{myMember.vote_points}</strong>
      </p>

      {isLocked ? (
        <div className="p-4 bg-sand rounded-xl border border-sand-dark text-jungle-mid text-sm">
          Wagers are locked for this episode.
          {existingWager && (
            <p className="mt-2 font-medium text-jungle">Your submitted wager is locked in.</p>
          )}
        </div>
      ) : (
        <WagerClient
          memberId={myMember.id}
          episodeNumber={episodeNumber}
          availableVotePoints={myMember.vote_points}
          castaways={castaways ?? []}
          existing={existingWager ?? null}
        />
      )}
    </div>
  );
}

function getNextWeekdayET(weekday: number, hourET: number, from: Date): Date {
  const ET_OFFSET = -5; // EST; todo: handle EDT -4 properly for production
  const nowET = new Date(from.getTime() + (ET_OFFSET - (from.getTimezoneOffset() / 60)) * 3600000);
  const target = new Date(nowET);
  target.setHours(hourET, 0, 0, 0);
  const diff = (weekday - nowET.getDay() + 7) % 7;
  target.setDate(target.getDate() + (diff === 0 && nowET >= target ? 7 : diff));
  // Convert back to UTC
  return new Date(target.getTime() - ET_OFFSET * 3600000);
}
