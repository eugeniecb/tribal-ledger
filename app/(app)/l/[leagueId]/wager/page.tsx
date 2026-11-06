import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WagerClient from "./WagerClient";
import { parseLeagueRuleSet } from "@/lib/rules";
import { Lock } from "lucide-react";
import { isWagerLocked, lockLabelCT } from "@/lib/wager-lock";

interface Props {
  params: Promise<{ leagueId: string }>;
}

// Episode number is derived from the latest episode import, or defaults to 1
async function getCurrentEpisode(supabase: any, seasonId: string): Promise<{ episodeNumber: number; latestImportAt: Date | null }> {
  const { data } = await supabase
    .from("episode_imports")
    .select("episode_number, imported_at")
    .eq("season_id", seasonId)
    .order("episode_number", { ascending: false })
    .limit(1);
  const latest = data?.[0];
  return {
    episodeNumber: (latest?.episode_number ?? 0) + 1,
    latestImportAt: latest?.imported_at ? new Date(latest.imported_at) : null,
  };
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

  const { episodeNumber, latestImportAt } = await getCurrentEpisode(supabase, league.season_id);
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
  const lockLabel = lockLabelCT(lockWeekday, lockHourET);
  const isLocked = existingWager?.locked || isWagerLocked({ now: new Date(), lockWeekday, lockHourET, latestImportAt });
  const submittedPicks = (castaways ?? [])
    .map((castaway) => ({
      id: castaway.id,
      name: castaway.name,
      budget: Number(existingWager?.budget_allocations?.[castaway.id] ?? 0),
      extra: Number(existingWager?.extra_wagers?.[castaway.id] ?? 0),
    }))
    .filter((pick) => pick.budget > 0 || pick.extra > 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-xs font-semibold text-torch uppercase tracking-widest mb-1">Episode {episodeNumber}</p>
      <h1 className="text-3xl font-bold text-jungle">{isLocked ? "Your Wager" : "Place Your Wager"}</h1>
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
              <p className="mt-0.5">Wagers are locked for this episode and can no longer be changed.</p>
            </div>
          </div>
          {existingWager ? (
            submittedPicks.length > 0 ? (
              <table className="w-full mt-4 text-left">
                <caption className="text-left font-bold text-jungle mb-2">Your submitted wager</caption>
                <thead>
                  <tr className="border-b border-jungle/20 text-xs">
                    <th scope="col" className="py-2 pr-2">Castaway</th>
                    <th scope="col" className="py-2 px-2 text-right">Budget points</th>
                    <th scope="col" className="py-2 pl-2 text-right">Extra wager</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedPicks.map((pick) => (
                    <tr key={pick.id} className="border-b border-jungle/10">
                      <th scope="row" className="py-3 pr-2 font-medium text-jungle">{pick.name}</th>
                      <td className="py-3 px-2 text-right tabular-nums">{pick.budget}</td>
                      <td className="py-3 pl-2 text-right tabular-nums">{pick.extra}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-jungle">
                    <th scope="row" className="pt-3 pr-2">Total</th>
                    <td className="pt-3 px-2 text-right tabular-nums">{submittedPicks.reduce((sum, pick) => sum + pick.budget, 0)}</td>
                    <td className="pt-3 pl-2 text-right tabular-nums">{submittedPicks.reduce((sum, pick) => sum + pick.extra, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="mt-2">Your submitted wager has no point allocations.</p>
            )
          ) : (
            <p className="mt-2">You did not submit a wager for this episode.</p>
          )}
        </div>
      ) : (
        <WagerClient
          memberId={myMember.id}
          episodeNumber={episodeNumber}
          availableVotePoints={myMember.vote_points}
          weeklyBudget={rules.weekly_wager_budget}
          castaways={(castaways ?? []).filter((castaway) => !castaway.is_eliminated)}
          existing={existingWager ?? null}
        />
      )}
    </div>
  );
}

