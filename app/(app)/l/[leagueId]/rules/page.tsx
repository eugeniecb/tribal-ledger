import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EVENT_KEYS, parseLeagueRuleSet } from "@/lib/rules";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function LeagueRulesPage({ params }: Props) {
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
    .select("name, rule_set")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();
  const rules = parseLeagueRuleSet((league as any).rule_set);
  const modeLabelMap: Record<string, string> = {
    classic: "Classic",
    high_risk: "High Risk",
    no_wagers: "No Wagers",
    idol_hunter: "Idol Hunter",
    custom: "Custom",
  };
  const modeLabel = modeLabelMap[rules.game_mode ?? "classic"] ?? "Classic";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-1">League Rules</h1>
      <p className="text-jungle-mid text-sm mb-6">
        {league.name} rules were locked at creation and cannot be changed.
      </p>

      <div className="bg-white border border-sand-dark rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-jungle mb-3">Modules</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-sand px-3 py-2">
            <span className="text-jungle-mid">Game Mode</span>
            <span className="font-medium text-jungle">{modeLabel}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-sand px-3 py-2">
            <span className="text-jungle-mid">Wagers</span>
            <span className="font-medium text-jungle">{rules.wagers_enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-sand px-3 py-2">
            <span className="text-jungle-mid">Sole Survivor</span>
            <span className="font-medium text-jungle">{rules.sole_survivor_enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-sand-dark rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-jungle mb-3">Wager Settings</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-sand px-3 py-2">
            <span className="text-jungle-mid">Weekly Budget</span>
            <span className="font-medium text-jungle">{rules.weekly_wager_budget}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-sand px-3 py-2">
            <span className="text-jungle-mid">Extra Win Multiplier</span>
            <span className="font-medium text-jungle">{rules.extra_wager_win_multiplier}x</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-sand-dark rounded-xl p-5">
        <h2 className="text-sm font-semibold text-jungle mb-3">Event Points</h2>
        <div className="space-y-2">
          {EVENT_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-sand px-3 py-2 text-sm">
              <span className="capitalize text-jungle-mid">{key}</span>
              <span className="font-medium text-jungle">{rules.event_points[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
