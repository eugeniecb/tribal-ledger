"use client";

import { useState } from "react";

interface Props {
  messageId: string;
  senderName: string;
  message: string;
}

export default function TrashTalkBanner({ messageId, senderName, message }: Props) {
  const [hidden, setHidden] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss() {
    setDismissing(true);
    setError(null);
    try {
      const res = await fetch("/api/trash-talk/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to dismiss");
      setHidden(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDismissing(false);
    }
  }

  if (hidden) return null;

  return (
    <div className="mb-6 rounded-xl border border-torch/40 bg-torch/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-jungle">Trash Talk Received</p>
          <p className="text-sm text-jungle-mid mt-0.5">
            <span className="font-medium text-jungle">{senderName}</span> sent you a message:
          </p>
          <p className="mt-2 text-sm text-jungle">“{message}”</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={dismissing}
          className="text-xs text-jungle-mid underline hover:text-torch disabled:opacity-50"
        >
          {dismissing ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
    </div>
  );
}
