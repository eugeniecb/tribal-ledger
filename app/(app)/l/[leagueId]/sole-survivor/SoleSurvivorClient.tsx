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

      <p className="text-xs font-medium text-jungle-mid uppercase tracking-wide mb-4">Still in the game</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6 mb-8">
        {liveCastaways.map((c) => {
          const selected = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => { setSelectedId(c.id); setSaved(false); }}
              className="group flex flex-col items-center gap-3 text-center focus:outline-none"
            >
              <CastawayPhoto castaway={c} selected={selected} />
              <span className={`text-sm font-extrabold uppercase tracking-wider ${selected ? "text-torch" : "text-jungle"}`}>
                {c.name}
              </span>
              {c.tribe && <span className="-mt-2 text-xs text-jungle-mid">{c.tribe}</span>}
            </button>
          );
        })}
      </div>

      {eliminatedCastaways.length > 0 && (
        <>
          <p className="text-xs font-medium text-jungle-mid uppercase tracking-wide mb-4">Voted out (ineligible)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-5 mb-8">
            {eliminatedCastaways.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2 text-center opacity-50">
                <CastawayPhoto castaway={c} selected={false} />
                <span className="text-xs font-bold uppercase tracking-wider text-jungle-mid line-through">{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-parchment/95 backdrop-blur border-t border-sand-dark">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !selectedId || selectedId === activeCastawayId}
          className="flex items-center gap-2 bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
        >
          {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Save Pick"}
        </button>
      </div>
    </div>
  );
}

function CastawayPhoto({ castaway, selected }: { castaway: Castaway; selected: boolean }) {
  return (
    <div className="relative w-full max-w-44">
      <div
        className={`aspect-square w-full rounded-full overflow-hidden bg-sand-dark border-[6px] transition-all ${
          selected
            ? "border-torch shadow-lg shadow-torch/25"
            : "border-sand-dark group-hover:border-jungle-mid/40 group-focus-visible:border-jungle-mid"
        } ${castaway.is_eliminated ? "grayscale" : ""}`}
      >
        {castaway.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={castaway.image_url} alt={castaway.name} className="w-full h-full object-cover object-[50%_20%]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-jungle-mid">{castaway.name[0]}</div>
        )}
      </div>
      {selected && (
        <span className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-torch text-white shadow ring-2 ring-parchment">
          <Check size={16} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
