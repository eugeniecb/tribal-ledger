"use client";

import { useState } from "react";
import { CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Delta {
  memberId: string;
  deltaCastawayPoints: number;
  deltaVotePoints: number;
  breakdown: { source: string; castawayName?: string; reason: string; delta: number }[];
}

interface Draft {
  id: string;
  status: "pending" | "approved";
  created_at: string;
  approved_at: string | null;
  episode_imports: { episode_number: number };
  deltas: Delta[];
}

interface Props {
  drafts: Draft[];
  leagueId: string;
  userId: string;
}

export default function AdminClient({ drafts, leagueId, userId }: Props) {
  const [localDrafts, setLocalDrafts] = useState(drafts);
  const [approving, setApproving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
      {localDrafts.map((draft) => {
        const ep = draft.episode_imports?.episode_number ?? "?";
        const isExpanded = expanded[draft.id];

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
                  {isExpanded ? "Hide" : "Details"}
                </button>
                {draft.status === "pending" && (
                  <button
                    onClick={() => handleApprove(draft.id)}
                    disabled={approving === draft.id}
                    className="bg-jungle text-white text-sm px-4 py-1.5 rounded-lg hover:bg-jungle-mid disabled:opacity-50 transition-colors"
                  >
                    {approving === draft.id ? "Approving…" : "Approve"}
                  </button>
                )}
              </div>
            </div>

            {errors[draft.id] && (
              <p className="px-5 pb-3 text-sm text-red-600">{errors[draft.id]}</p>
            )}

            {isExpanded && (
              <div className="border-t border-sand-dark px-5 py-4">
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
                        <td className="py-2 text-jungle font-mono text-xs truncate max-w-[140px]">{d.memberId}</td>
                        <td className="py-2 text-right text-jungle">{d.deltaCastawayPoints >= 0 ? "+" : ""}{d.deltaCastawayPoints}</td>
                        <td className="py-2 text-right text-jungle">{d.deltaVotePoints >= 0 ? "+" : ""}{d.deltaVotePoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
