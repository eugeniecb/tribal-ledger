"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";

interface Castaway {
  id: string;
  name: string;
  image_url: string | null;
  tribe: string | null;
  is_eliminated: boolean;
}

interface Props {
  memberId: string;
  castaways: Castaway[];
  activeCastawayId: string | null;
  currentEpisode: number;
  totalEpisodes: number;
}

export default function SoleSurvivorClient({ memberId, castaways, activeCastawayId, currentEpisode, totalEpisodes }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(activeCastawayId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const potentialPoints = (id: string) => {
    return totalEpisodes - currentEpisode + 1;
  };

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sole-survivor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, castaway_id: selectedId, episode_number: currentEpisode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const liveCastaways = castaways.filter((c) => !c.is_eliminated);
  const eliminatedCastaways = castaways.filter((c) => c.is_eliminated);

  return (
    <div>
      {selectedId && (
        <div className="mb-6 p-4 bg-sand border border-sand-dark rounded-xl flex items-center gap-3">
          <Star size={18} className="text-torch flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-jungle">
              Current pick: <strong>{castaways.find((c) => c.id === selectedId)?.name}</strong>
            </p>
            <p className="text-xs text-jungle-mid">
              Worth up to <strong>{potentialPoints(selectedId)} pts</strong> if correct
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-6">
        <p className="text-xs font-medium text-jungle-mid uppercase tracking-wide mb-2">Still in the game</p>
        {liveCastaways.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); setSaved(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              selectedId === c.id
                ? "border-torch bg-torch/5"
                : "border-sand-dark bg-white hover:border-jungle-mid"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-sand-dark overflow-hidden flex-shrink-0">
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-jungle-mid">{c.name[0]}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-jungle">{c.name}</p>
              {c.tribe && <p className="text-xs text-jungle-mid">{c.tribe}</p>}
            </div>
            {selectedId === c.id && <Check size={16} className="text-torch flex-shrink-0" />}
          </button>
        ))}

        {eliminatedCastaways.length > 0 && (
          <>
            <p className="text-xs font-medium text-jungle-mid uppercase tracking-wide mt-4 mb-2">Voted out (ineligible)</p>
            {eliminatedCastaways.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-sand-dark bg-sand/50 opacity-50">
                <div className="w-9 h-9 rounded-full bg-sand-dark overflow-hidden flex-shrink-0">
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-jungle-mid">{c.name[0]}</div>
                </div>
                <p className="text-sm text-jungle line-through">{c.name}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !selectedId || selectedId === activeCastawayId}
        className="flex items-center gap-2 bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
      >
        {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Save Pick"}
      </button>
    </div>
  );
}
