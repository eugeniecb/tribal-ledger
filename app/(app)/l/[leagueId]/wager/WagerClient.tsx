"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { WEEKLY_WAGER_BUDGET } from "@/lib/scoring";

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
  castaways: Castaway[];
  existing: { budget_allocations: Record<string, number>; extra_wagers: Record<string, number> } | null;
}

export default function WagerClient({ memberId, episodeNumber, availableVotePoints, castaways, existing }: Props) {
  const [budget, setBudget] = useState<Record<string, number>>(existing?.budget_allocations ?? {});
  const [extra, setExtra] = useState<Record<string, number>>(existing?.extra_wagers ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const budgetTotal = Object.values(budget).reduce((s, v) => s + (Number(v) || 0), 0);
  const extraTotal = Object.values(extra).reduce((s, v) => s + (Number(v) || 0), 0);
  const budgetRemaining = WEEKLY_WAGER_BUDGET - budgetTotal;
  const extraRemaining = availableVotePoints - extraTotal;

  function setAllocation(castawayId: string, value: string, pool: "budget" | "extra") {
    const n = parseInt(value) || 0;
    const setter = pool === "budget" ? setBudget : setExtra;
    setter((prev) => ({ ...prev, [castawayId]: Math.max(0, n) }));
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
          available_vote_points: availableVotePoints,
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
      <div className="flex gap-4 mb-6 text-sm">
        <div className={`flex-1 p-3 rounded-lg border ${budgetRemaining < 0 ? "border-red-400 bg-red-50" : "border-sand-dark bg-sand"}`}>
          <p className="text-jungle-mid text-xs mb-0.5">Weekly Budget Remaining</p>
          <p className={`text-2xl font-bold ${budgetRemaining < 0 ? "text-red-600" : "text-jungle"}`}>{budgetRemaining}</p>
          <p className="text-jungle-mid text-xs">of {WEEKLY_WAGER_BUDGET} free pts</p>
        </div>
        <div className={`flex-1 p-3 rounded-lg border ${extraRemaining < 0 ? "border-red-400 bg-red-50" : "border-sand-dark bg-sand"}`}>
          <p className="text-jungle-mid text-xs mb-0.5">Extra Wager Remaining</p>
          <p className={`text-2xl font-bold ${extraRemaining < 0 ? "text-red-600" : "text-jungle"}`}>{extraRemaining}</p>
          <p className="text-jungle-mid text-xs">of {availableVotePoints} earned pts</p>
        </div>
      </div>

      {/* Castaway rows */}
      <div className="space-y-2 mb-6">
        <div className="grid grid-cols-[1fr_100px_100px] gap-3 text-xs font-medium text-jungle-mid px-4 mb-1">
          <span>Castaway</span>
          <span className="text-center">Weekly Budget</span>
          <span className="text-center">Extra Wager</span>
        </div>
        {castaways.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_100px_100px] gap-3 items-center bg-white border border-sand-dark rounded-lg px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-sand-dark overflow-hidden flex-shrink-0">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-jungle-mid">{c.name[0]}</div>
                )}
              </div>
              <span className="text-sm text-jungle truncate">{c.name}</span>
            </div>
            <input
              type="number"
              min={0}
              max={WEEKLY_WAGER_BUDGET}
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
        disabled={saving || budgetRemaining < 0 || extraRemaining < 0}
        className="flex items-center gap-2 bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
      >
        {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Submit Wager"}
      </button>
    </form>
  );
}
