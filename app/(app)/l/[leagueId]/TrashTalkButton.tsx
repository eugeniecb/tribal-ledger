"use client";

import { useState } from "react";

interface Props {
  leagueId: string;
  recipientMemberId: string;
  recipientName: string;
}

export default function TrashTalkButton({ leagueId, recipientMemberId, recipientName }: Props) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/trash-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          recipient_member_id: recipientMemberId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send trash talk");
      setFeedback(`Sent: "${data.message}"`);
    } catch (err: any) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-torch underline hover:text-torch-dark disabled:opacity-50"
        title={`Send trash talk to ${recipientName}`}
      >
        {loading ? "Sending…" : "Trash Talk"}
      </button>
      {feedback && <p className="mt-1 text-[11px] text-jungle-mid">{feedback}</p>}
    </div>
  );
}
