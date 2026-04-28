"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create league");
      router.push(`/l/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-jungle mb-2">Create a League</h1>
      <p className="text-jungle-mid mb-8">Give your league a name and share the invite code with friends.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-jungle mb-1.5" htmlFor="name">
            League Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ponderosa Pals"
            required
            maxLength={60}
            className="w-full border border-sand-dark rounded-lg px-4 py-2.5 text-jungle focus:outline-none focus:ring-2 focus:ring-torch focus:border-transparent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-torch text-white py-3 rounded-lg font-semibold hover:bg-torch-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating…" : "Create League"}
        </button>
      </form>
    </div>
  );
}
