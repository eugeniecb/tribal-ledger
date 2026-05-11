"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinLeaguePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [tribeName, setTribeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: code.trim().toUpperCase(),
          tribe_name: tribeName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join league");
      router.push(`/l/${data.league_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-jungle mb-2">Join a League</h1>
      <p className="text-jungle-mid mb-8">Enter the invite code your friend shared.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-jungle mb-1.5" htmlFor="code">
            Invite Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            required
            maxLength={10}
            className="w-full border border-sand-dark rounded-lg px-4 py-2.5 text-jungle font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !code.trim() || !tribeName.trim()}
          className="w-full bg-torch text-white py-3 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Joining…" : "Join League"}
        </button>
      </form>
    </div>
  );
}
