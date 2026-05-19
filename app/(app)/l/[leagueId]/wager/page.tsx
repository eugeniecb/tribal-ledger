import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WagerClient from "./WagerClient";
import { parseLeagueRuleSet } from "@/lib/rules";
import { Lock } from "lucide-react";

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
    .select("season_id, rule_set, seasons(total_episodes, episode_lock_weekday, episode_lock_hour_et)")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const episodeNumber = await getCurrentEpisodeNumber(supabase, league.season_id);
  const rules = parseLeagueRuleSet((league as any).rule_set);

  if (!rules.wagers_enabled) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-jungle mb-2">Episode {episodeNumber} Wager</h1>
        <div className="p-4 bg-sand rounded-xl border border-sand-dark text-jungle-mid text-sm">
          Wagers are disabled for this league.
        </div>
      </div>
    );
  }

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
  const lockHourCT = (lockHourET + 23) % 24;
  const lockWeekdayLabel = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][lockWeekday] ?? "Wednesday";
  const lockHourLabel = to12Hour(lockHourCT);
  const lockLabel = `${lockWeekdayLabel} ${lockHourLabel} CT`;
  const nowCt = getCtParts(new Date());
  const isLocked = existingWager?.locked || (
    nowCt.weekday > lockWeekday ||
    (nowCt.weekday === lockWeekday &&
      (nowCt.hour > lockHourCT || (nowCt.hour === lockHourCT && nowCt.minute >= 0)))
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-xs font-semibold text-torch uppercase tracking-widest mb-1">Episode {episodeNumber}</p>
      <h1 className="text-3xl font-bold text-jungle">Place Your Wager</h1>
      <p className="text-jungle-mid text-sm mt-1">Predict who gets voted out. Risk your earned points for a bigger payoff.</p>
      <p className="text-xs text-jungle-mid mt-2 flex items-center gap-1.5"><Lock size={11} /> Locks {lockLabel}</p>
      <p className="text-jungle-mid text-sm mb-8">
        Your available vote points: <strong>{myMember.vote_points}</strong>
      </p>

      {isLocked ? (
        <div className="p-5 bg-jungle/5 border-2 border-jungle/20 rounded-2xl text-jungle-mid text-sm">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-jungle mt-0.5" />
            <div>
              <p className="font-bold text-jungle">Wagers locked</p>
              <p className="mt-0.5">Wagers are locked for this episode.</p>
            </div>
          </div>
          {existingWager && (
            <p className="mt-2 font-medium text-jungle">Your submitted wager is locked in.</p>
          )}
        </div>
      ) : (
        <WagerClient
          memberId={myMember.id}
          episodeNumber={episodeNumber}
          availableVotePoints={myMember.vote_points}
          weeklyBudget={rules.weekly_wager_budget}
          castaways={castaways ?? []}
          existing={existingWager ?? null}
        />
      )}
    </div>
  );
}

function getCtParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekday ? weekdayMap[weekday] : 0,
    hour,
    minute,
  };
}

function to12Hour(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${suffix}`;
}
