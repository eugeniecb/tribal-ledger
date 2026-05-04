"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LEAGUE_RULE_SET, EVENT_KEYS } from "@/lib/rules";

export default function NewLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tribeName, setTribeName] = useState("");
  const [eventPoints, setEventPoints] = useState<Record<string, number>>({
    ...DEFAULT_LEAGUE_RULE_SET.event_points,
  });
  const [weeklyBudget, setWeeklyBudget] = useState(DEFAULT_LEAGUE_RULE_SET.weekly_wager_budget);
  const [extraMultiplier, setExtraMultiplier] = useState(DEFAULT_LEAGUE_RULE_SET.extra_wager_win_multiplier);
  const [wagersEnabled, setWagersEnabled] = useState(DEFAULT_LEAGUE_RULE_SET.wagers_enabled);
  const [soleSurvivorEnabled, setSoleSurvivorEnabled] = useState(DEFAULT_LEAGUE_RULE_SET.sole_survivor_enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tribe_name: tribeName,
          rule_set: {
            event_points: eventPoints,
            weekly_wager_budget: weeklyBudget,
            extra_wager_win_multiplier: extraMultiplier,
            wagers_enabled: wagersEnabled,
            sole_survivor_enabled: soleSurvivorEnabled,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create league");
      router.push(`/l/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-jungle mb-2">Create a League</h1>
      <p className="text-jungle-mid mb-8">Give your league a name and share the invite code with friends.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-jungle mb-1.5" htmlFor="name">
            League Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ponderosa Pals"
            required
            maxLength={60}
            className="w-full border border-sand-dark rounded-lg px-4 py-2.5 text-jungle focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-jungle mb-1.5" htmlFor="tribeName">
            Your Tribe Name
          </label>
          <input
            id="tribeName"
            type="text"
            value={tribeName}
            onChange={(e) => setTribeName(e.target.value)}
            placeholder="e.g. Snuff Said"
            required
            maxLength={60}
            className="w-full border border-sand-dark rounded-lg px-4 py-2.5 text-jungle focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
          />
        </div>
        <section className="rounded-xl border border-sand-dark bg-white p-4">
          <h2 className="text-sm font-semibold text-jungle mb-3">League Rules (locked after create)</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-jungle">Wagers enabled</span>
              <input
                type="checkbox"
                checked={wagersEnabled}
                onChange={(e) => setWagersEnabled(e.target.checked)}
                className="h-4 w-4 accent-torch"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-jungle">Sole Survivor enabled</span>
              <input
                type="checkbox"
                checked={soleSurvivorEnabled}
                onChange={(e) => setSoleSurvivorEnabled(e.target.checked)}
                className="h-4 w-4 accent-torch"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-jungle">
                Weekly wager budget
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(Math.max(0, Number.parseInt(e.target.value || "0", 10)))}
                  className="mt-1 h-12 w-full border border-sand-dark rounded-lg px-3 text-jungle focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
                />
              </label>
              <label className="text-sm text-jungle">
                Extra wager win multiplier
                <input
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={extraMultiplier}
                  onChange={(e) => setExtraMultiplier(Number.parseFloat(e.target.value || "0"))}
                  className="mt-1 h-12 w-full border border-sand-dark rounded-lg px-3 text-jungle focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-medium text-jungle-mid uppercase tracking-wide mb-2">Event points</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVENT_KEYS.map((key) => (
                  <label key={key} className="text-sm text-jungle flex items-center justify-between gap-3 rounded-lg border border-sand-dark px-3 py-2 bg-sand/30">
                    <span className="capitalize">{key}</span>
                    <input
                      type="number"
                      min={-20}
                      max={50}
                      value={eventPoints[key]}
                      onChange={(e) =>
                        setEventPoints((prev) => ({
                          ...prev,
                          [key]: Number.parseInt(e.target.value || "0", 10),
                        }))
                      }
                      className="h-12 w-24 border border-sand-dark rounded-lg px-3 text-right text-jungle focus:outline-none focus:ring-1 focus:ring-torch bg-white"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim() || !tribeName.trim()}
          className="w-full bg-torch text-white py-3 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating…" : "Create League"}
        </button>
      </form>
    </div>
  );
}
