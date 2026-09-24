"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { NO_TRIBE } from "@/lib/scoring";

interface Castaway {
  id: string;
  name: string;
  image_url: string | null;
  tribe: string | null;
  is_eliminated: boolean;
}

interface Props {
  memberId: string;
  episodeNumber: number;
  availableVotePoints: number;
  weeklyBudget: number;
  castaways: Castaway[];
  existing: { budget_allocations: Record<string, number>; extra_wagers: Record<string, number> } | null;
}

export default function WagerClient({ memberId, episodeNumber, availableVotePoints, weeklyBudget, castaways, existing }: Props) {
  const [budget, setBudget] = useState<Record<string, number>>(existing?.budget_allocations ?? {});
  const [extra, setExtra] = useState<Record<string, number>>(existing?.extra_wagers ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // The free budget applies separately to each tribe.
  const tribes = Array.from(new Set(castaways.map((c) => c.tribe || NO_TRIBE))).sort((a, b) =>
    a === NO_TRIBE ? 1 : b === NO_TRIBE ? -1 : a.localeCompare(b)
  );
  const budgetRemainingByTribe = new Map(
    tribes.map((tribe) => {
      const used = castaways
        .filter((c) => (c.tribe || NO_TRIBE) === tribe)
        .reduce((s, c) => s + (Number(budget[c.id]) || 0), 0);
      return [tribe, weeklyBudget - used];
    })
  );
  const overBudget = Array.from(budgetRemainingByTribe.values()).some((r) => r < 0);
  const extraTotal = Object.values(extra).reduce((s, v) => s + (Number(v) || 0), 0);
  const extraRemaining = availableVotePoints - extraTotal;

  function setAllocation(castawayId: string, value: string, pool: "budget" | "extra") {
    const setter = pool === "budget" ? setBudget : setExtra;
    setter((prev) => {
      if (value.trim() === "") {
        const { [castawayId]: _removed, ...rest } = prev;
        return rest;
      }
      const n = parseInt(value, 10);
      return { ...prev, [castawayId]: Math.max(0, Number.isFinite(n) ? n : 0) };
    });
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const res = await fetch("/api/wagers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          episode_number: episodeNumber,
          budget_allocations: Object.fromEntries(Object.entries(budget).filter(([, v]) => v > 0)),
          extra_wagers: Object.fromEntries(Object.entries(extra).filter(([, v]) => v > 0)),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors?.map((e: any) => e.message) ?? [data.error ?? "Failed to save"]);
        return;
      }
      setSaved(true);
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Budget summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 text-sm">
        {tribes.map((tribe) => {
          const remaining = budgetRemainingByTribe.get(tribe) ?? weeklyBudget;
          return (
            <div key={tribe} className={`p-3 rounded-lg border ${remaining < 0 ? "border-red-400 bg-red-50" : "border-sand-dark bg-sand"}`}>
              <p className="text-jungle-mid text-xs mb-0.5">{tribe} Budget Remaining</p>
              <p className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : "text-jungle"}`}>{remaining}</p>
              <p className="text-jungle-mid text-xs">of {weeklyBudget} free pts</p>
            </div>
          );
        })}
        <div className={`p-3 rounded-lg border ${extraRemaining < 0 ? "border-red-400 bg-red-50" : "border-sand-dark bg-sand"}`}>
          <p className="text-jungle-mid text-xs mb-0.5">Extra Wager Remaining</p>
          <p className={`text-2xl font-bold ${extraRemaining < 0 ? "text-red-600" : "text-jungle"}`}>{extraRemaining}</p>
          <p className="text-jungle-mid text-xs">of {availableVotePoints} earned pts, any tribe</p>
        </div>
      </div>

      {/* Castaway rows, grouped by tribe */}
      <div className="space-y-6 mb-6">
        {tribes.map((tribe) => (
          <section key={tribe} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-jungle">{tribe}</h3>
              <span className="text-xs text-jungle-mid">
                {budgetRemainingByTribe.get(tribe)} of {weeklyBudget} free pts left
              </span>
            </div>
            <div className="grid grid-cols-[1fr_100px_100px] gap-3 text-xs font-medium text-jungle-mid px-4 mb-1">
              <span>Castaway</span>
              <span className="text-center">Weekly Budget</span>
              <span className="text-center">Extra Wager</span>
            </div>
            {castaways
              .filter((c) => (c.tribe || NO_TRIBE) === tribe)
              .map((c) => (
                <div key={c.id} className="grid grid-cols-[1fr_100px_100px] gap-3 items-center bg-white border border-sand-dark rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sand-dark border-[3px] border-sand-dark overflow-hidden flex-shrink-0">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt={c.name} className="w-full h-full object-cover object-[50%_20%]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-jungle-mid">{c.name[0]}</div>
                      )}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wide text-jungle truncate">{c.name}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={weeklyBudget}
                    value={budget[c.id] ?? ""}
                    onChange={(e) => setAllocation(c.id, e.target.value, "budget")}
                    placeholder="0"
                    className="w-full border border-sand-dark rounded px-2 py-1.5 text-center text-sm text-jungle focus:outline-none focus:ring-1 focus:ring-torch"
                  />
                  <input
                    type="number"
                    min={0}
                    max={availableVotePoints}
                    value={extra[c.id] ?? ""}
                    onChange={(e) => setAllocation(c.id, e.target.value, "extra")}
                    placeholder="0"
                    className="w-full border border-sand-dark rounded px-2 py-1.5 text-center text-sm text-jungle focus:outline-none focus:ring-1 focus:ring-torch"
                  />
                </div>
              ))}
          </section>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="flex items-center gap-1.5"><AlertCircle size={13} /> {e}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || overBudget || extraRemaining < 0}
        className="flex items-center gap-2 bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
      >
        {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Submit Wager"}
      </button>
    </form>
  );
}
