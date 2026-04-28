"use client";

import { Copy } from "lucide-react";

export default function CopyButton({ code }: { code: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(code)}
      className="text-jungle-mid hover:text-torch transition-colors"
      title="Copy invite code"
      type="button"
    >
      <Copy size={13} />
    </button>
  );
}
