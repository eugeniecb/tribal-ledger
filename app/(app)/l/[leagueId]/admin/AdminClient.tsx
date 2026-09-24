"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { EVENT_KEYS } from "@/lib/rules";

interface Delta {
  memberId: string;
  deltaCastawayPoints: number;
  deltaVotePoints: number;
  breakdown: { source: string; castawayName?: string; reason: string; delta: number }[];
}

interface EpisodeFacts {
  votedOutNames: string[];
  events: { castawayName: string; eventKey: string; sourcePoints: number }[];
}

interface Draft {
  id: string;
  status: "pending" | "approved";
  created_at: string;
  approved_at: string | null;
  episode_imports: { episode_number: number; raw_facts: EpisodeFacts | null };
  deltas: Delta[];
}

interface Props {
  drafts: Draft[];
  leagueId: string;
  userId: string;
  ruleSet: {
    event_points?: Record<string, number>;
  } | null;
  members: {
    id: string;
    profile_id: string;
    tribe_name: string | null;
    profiles?: { display_name?: string | null } | null;
  }[];
  castaways: { id: string; name: string; is_eliminated: boolean }[];
}

export default function AdminClient({ drafts, leagueId, userId, ruleSet, members, castaways }: Props) {
  const router = useRouter();
  const [localDrafts, setLocalDrafts] = useState(drafts);
  const [approving, setApproving] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ssWinnerId, setSsWinnerId] = useState("");
  const [ssSubmitting, setSsSubmitting] = useState(false);
  const [ssResult, setSsResult] = useState<{ winner: string; picks: number } | null>(null);
  const [ssError, setSsError] = useState<string | null>(null);
  const [editedFacts, setEditedFacts] = useState<Record<string, EpisodeFacts>>(() =>
    Object.fromEntries(
      drafts.map((d) => [
        d.id,
        {
          votedOutNames: d.episode_imports?.raw_facts?.votedOutNames ?? [],
          events: d.episode_imports?.raw_facts?.events ?? [],
        },
      ])
    )
  );

  const scoringRows = useMemo(() => {
    const points = ruleSet?.event_points ?? {};
    return EVENT_KEYS.map((k) => ({ key: k, points: points[k] ?? 0 }));
  }, [ruleSet]);
  const leaguePoints = ruleSet?.event_points ?? {};
  // New rows ("") stay in the editable table until an event is chosen.
  const isScoredKey = (key: string) => key === "" || EVENT_KEYS.includes(key as any);
  const memberNameMap = useMemo(
    () =>
      new Map(
        (members ?? []).map((m) => [
          m.id,
          m.tribe_name ?? m.profiles?.display_name ?? m.profile_id ?? m.id,
        ])
      ),
    [members]
  );

  async function handleApprove(draftId: string) {
    setApproving(draftId);
    setErrors((prev) => ({ ...prev, [draftId]: "" }));
    try {
      const res = await fetch(`/api/score-drafts/${draftId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      setLocalDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "approved", approved_at: new Date().toISOString() } : d))
      );
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [draftId]: err.message }));
    } finally {
      setApproving(null);
    }
  }

  async function handleSaveReview(draftId: string) {
    setSaving(draftId);
    setErrors((prev) => ({ ...prev, [draftId]: "" }));
    try {
      const facts = editedFacts[draftId];
      const payload = {
        votedOutNames: (facts.votedOutNames ?? []).map((n) => n.trim()).filter(Boolean),
        events: (facts.events ?? [])
          .map((e) => ({
            castawayName: e.castawayName.trim(),
            eventKey: e.eventKey,
            sourcePoints: Number.isFinite(e.sourcePoints) ? e.sourcePoints : 0,
          }))
          .filter((e) => e.castawayName && e.eventKey),
      };

      const res = await fetch(`/api/score-drafts/${draftId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save review");

      setLocalDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId
            ? {
                ...d,
                deltas: data.deltas ?? d.deltas,
                episode_imports: {
                  ...d.episode_imports,
                  raw_facts: {
                    votedOutNames: payload.votedOutNames,
                    events: payload.events,
                  },
                },
              }
            : d
        )
      );
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [draftId]: err.message }));
    } finally {
      setSaving(null);
    }
  }

  function setVotedOutText(draftId: string, value: string) {
    setEditedFacts((prev) => ({
      ...prev,
      [draftId]: {
        ...prev[draftId],
        votedOutNames: value.split(",").map((s) => s.trim()).filter(Boolean),
      },
    }));
  }

  function updateEvent(draftId: string, index: number, patch: Partial<EpisodeFacts["events"][number]>) {
    setEditedFacts((prev) => {
      const facts = prev[draftId] ?? { votedOutNames: [], events: [] };
      const nextEvents = [...facts.events];
      nextEvents[index] = { ...nextEvents[index], ...patch };
      return { ...prev, [draftId]: { ...facts, events: nextEvents } };
    });
  }

  function addEvent(draftId: string) {
    setEditedFacts((prev) => {
      const facts = prev[draftId] ?? { votedOutNames: [], events: [] };
      return {
        ...prev,
        [draftId]: {
          ...facts,
          events: [...facts.events, { castawayName: "", eventKey: "", sourcePoints: 0 }],
        },
      };
    });
  }

  function removeEvent(draftId: string, index: number) {
    setEditedFacts((prev) => {
      const facts = prev[draftId] ?? { votedOutNames: [], events: [] };
      return {
        ...prev,
        [draftId]: {
          ...facts,
          events: facts.events.filter((_, i) => i !== index),
        },
      };
    });
  }

  const alreadySettled = localDrafts.some(
    (d) =>
      d.status === "approved" &&
      d.deltas.some((delta) => delta.breakdown.some((b) => b.source === "sole_survivor"))
  );

  async function handleSettleSoleSurvivor() {
    if (!ssWinnerId) return;
    setSsSubmitting(true);
    setSsError(null);
    setSsResult(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/settle-sole-survivor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castaway_id: ssWinnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to settle");
      setSsResult({ winner: data.winner, picks: data.picks });
      // Reload page to show the new pending draft
      window.location.reload();
    } catch (err: any) {
      setSsError(err.message);
    } finally {
      setSsSubmitting(false);
    }
  }

  async function handleImportRecaps() {
    setImporting(true);
    setImportMessage("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/import-recaps`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import recaps");
      const episodes = Array.isArray(data.importedEpisodes) ? data.importedEpisodes.join(", ") : "unknown";
      setImportMessage(`Imported episodes: ${episodes}`);
      router.refresh();
    } catch (err: any) {
      setImportMessage(err.message ?? "Failed to import recaps");
    } finally {
      setImporting(false);
    }
  }

  if (localDrafts.length === 0) {
    return (
      <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
        <p className="font-medium mb-1">No score drafts yet</p>
        <p className="text-sm">Score drafts appear here after the weekly cron import runs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {castaways.length > 0 && (
        <div className="bg-white border border-sand-dark rounded-xl p-5">
          <h2 className="text-base font-semibold text-jungle mb-1">Settle Sole Survivor</h2>
          <p className="text-xs text-jungle-mid mb-4">
            Select the season winner to generate a score draft for all active picks. The draft will appear above for review and approval.
          </p>
          {alreadySettled ? (
            <p className="text-sm text-green-700 font-medium">Sole Survivor has already been settled and approved.</p>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={ssWinnerId}
                onChange={(e) => setSsWinnerId(e.target.value)}
                className="border border-sand-dark rounded px-3 py-2 text-sm text-jungle"
              >
                <option value="">Select winner…</option>
                {castaways.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.is_eliminated ? " (elim.)" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSettleSoleSurvivor}
                disabled={!ssWinnerId || ssSubmitting}
                className="bg-torch text-white text-sm px-4 py-2 rounded-lg hover:bg-torch-dark disabled:opacity-50 transition-colors"
              >
                {ssSubmitting ? "Settling…" : "Generate Draft"}
              </button>
            </div>
          )}
          {ssError && <p className="mt-2 text-sm text-red-600">{ssError}</p>}
          {ssResult && (
            <p className="mt-2 text-sm text-green-700">
              Draft created for {ssResult.winner} — {ssResult.picks} active pick{ssResult.picks !== 1 ? "s" : ""} scored.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-sand border border-sand-dark rounded-xl px-4 py-3">
        <p className="text-sm text-jungle-mid">
          Import all available Season recap episodes and regenerate pending drafts.
        </p>
        <button
          onClick={handleImportRecaps}
          disabled={importing}
          className="bg-jungle text-white text-sm px-4 py-2 rounded-lg hover:bg-jungle-mid disabled:opacity-50"
        >
          {importing ? "Importing…" : "Import Recaps"}
        </button>
      </div>
      {importMessage && (
        <p className={`text-sm ${importMessage.toLowerCase().includes("failed") ? "text-red-600" : "text-green-700"}`}>
          {importMessage}
        </p>
      )}
      {localDrafts.map((draft) => {
        const ep = draft.episode_imports?.episode_number ?? "?";
        const isExpanded = expanded[draft.id];
        const facts = editedFacts[draft.id] ?? { votedOutNames: [], events: [] };

        return (
          <div key={draft.id} className="bg-white border border-sand-dark rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                {draft.status === "approved" ? (
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                ) : (
                  <Clock size={18} className="text-torch flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-jungle">Episode {ep} Score Draft</p>
                  <p className="text-xs text-jungle-mid">
                    {draft.status === "approved"
                      ? `Approved ${new Date(draft.approved_at!).toLocaleDateString()}`
                      : `Created ${new Date(draft.created_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [draft.id]: !prev[draft.id] }))}
                  className="text-jungle-mid hover:text-jungle text-sm flex items-center gap-1"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {isExpanded ? "Hide" : "Review"}
                </button>
                {draft.status === "pending" && (
                  <button
                    onClick={() => handleApprove(draft.id)}
                    disabled={approving === draft.id || saving === draft.id}
                    className="bg-jungle text-white text-sm px-4 py-1.5 rounded-lg hover:bg-jungle-mid disabled:opacity-50 transition-colors"
                  >
                    {approving === draft.id ? "Approving…" : "Approve & Lock"}
                  </button>
                )}
              </div>
            </div>

            {errors[draft.id] && (
              <p className="px-5 pb-3 text-sm text-red-600">{errors[draft.id]}</p>
            )}

            {isExpanded && (
              <div className="border-t border-sand-dark px-5 py-4 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-jungle mb-2">League Scoring Rules</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {scoringRows.map((row) => (
                      <div key={row.key} className="flex items-center justify-between border border-sand-dark rounded px-2 py-1">
                        <span className="capitalize text-jungle-mid">{row.key}</span>
                        <span className="font-semibold text-jungle">{row.points >= 0 ? "+" : ""}{row.points}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-jungle mb-2">Recap Facts (Editable)</h3>
                  <label className="block text-xs text-jungle-mid mb-1">Voted Out Names (comma separated)</label>
                  <input
                    type="text"
                    value={facts.votedOutNames.join(", ")}
                    onChange={(e) => setVotedOutText(draft.id, e.target.value)}
                    className="w-full border border-sand-dark rounded px-3 py-2 text-sm text-jungle"
                  />

                  <p className="mt-4 text-xs text-jungle-mid">
                    Events your league scores. Points shown are your league&apos;s rules, not FSG&apos;s.
                  </p>
                  <div className="mt-1 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-jungle-mid border-b border-sand-dark">
                          <th className="text-left py-1">Castaway</th>
                          <th className="text-left py-1">Event</th>
                          <th className="text-right py-1">League Pts</th>
                          <th className="text-right py-1"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {facts.events.map((ev, i) => {
                          if (!isScoredKey(ev.eventKey)) return null;
                          const pts = leaguePoints[ev.eventKey] ?? 0;
                          return (
                            <tr key={`${draft.id}-${i}`} className="border-b border-sand-dark/50 last:border-0">
                              <td className="py-1 pr-2">
                                <input
                                  value={ev.castawayName}
                                  onChange={(e) => updateEvent(draft.id, i, { castawayName: e.target.value })}
                                  className="w-full border border-sand-dark rounded px-2 py-1"
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <select
                                  value={ev.eventKey}
                                  onChange={(e) => updateEvent(draft.id, i, { eventKey: e.target.value })}
                                  className="w-full border border-sand-dark rounded px-2 py-1"
                                >
                                  {ev.eventKey === "" && <option value="" disabled>Choose event…</option>}
                                  {EVENT_KEYS.map((k) => (
                                    <option key={k} value={k}>{k}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1 pr-2 text-right font-semibold text-jungle whitespace-nowrap">
                                {ev.eventKey ? `${pts >= 0 ? "+" : ""}${pts}` : "—"}
                              </td>
                              <td className="py-1 text-right">
                                <button onClick={() => removeEvent(draft.id, i)} className="text-xs text-red-600">Remove</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => addEvent(draft.id)} className="mt-2 text-sm text-torch underline">+ Add Event</button>

                  {draft.status === "pending" && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleSaveReview(draft.id)}
                        disabled={saving === draft.id || approving === draft.id}
                        className="bg-torch text-white text-sm px-4 py-1.5 rounded-lg hover:bg-torch-dark disabled:opacity-50"
                      >
                        {saving === draft.id ? "Recalculating…" : "Save Review & Recalculate"}
                      </button>
                    </div>
                  )}
                </section>

                <FsgOnlyEvents events={facts.events.filter((ev) => !isScoredKey(ev.eventKey))} />

                <section>
                  <h3 className="text-sm font-semibold text-jungle mb-2">Current Draft Deltas</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-jungle-mid border-b border-sand-dark">
                        <th className="text-left py-1.5">Member</th>
                        <th className="text-right py-1.5">Cast Pts</th>
                        <th className="text-right py-1.5">Vote Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.deltas ?? []).map((d) => (
                        <tr key={d.memberId} className="border-b border-sand-dark/50 last:border-0">
                          <td className="py-2 text-jungle truncate max-w-[180px]">
                            {memberNameMap.get(d.memberId) ?? "Unknown Player"}
                          </td>
                          <td className="py-2 text-right text-jungle">{d.deltaCastawayPoints >= 0 ? "+" : ""}{d.deltaCastawayPoints}</td>
                          <td className="py-2 text-right text-jungle">{d.deltaVotePoints >= 0 ? "+" : ""}{d.deltaVotePoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// FSG tracks more events than a league scores. Show them read-only so they can't be
// turned into scoring events by accident; they stay in the recap and score 0.
function FsgOnlyEvents({ events }: { events: EpisodeFacts["events"] }) {
  if (!events.length) return null;
  const byEvent = new Map<string, string[]>();
  for (const ev of events) {
    const names = byEvent.get(ev.eventKey) ?? [];
    names.push(ev.castawayName);
    byEvent.set(ev.eventKey, names);
  }
  return (
    <section>
      <h3 className="text-sm font-semibold text-jungle">Tracked by FSG, not scored in your league</h3>
      <p className="text-xs text-jungle-mid mb-2">For reference only. These earn 0 points and can&apos;t be edited here.</p>
      <ul className="rounded-lg border border-sand-dark bg-sand/40 divide-y divide-sand-dark/60 text-sm">
        {Array.from(byEvent.entries()).map(([key, names]) => (
          <li key={key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
            <span className="capitalize text-jungle-mid">{key}</span>
            <span className="text-jungle">{names.join(", ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
