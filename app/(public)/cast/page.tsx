import Link from "next/link";
import { Flame } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import type { Castaway, Season } from "@/lib/types";

export const revalidate = 3600;

export default async function CastPage() {
  let castaways: Castaway[] = [];
  let season: Season | null = null;

  try {
    const supabase = createServiceClient();
    const { data: seasons } = await supabase
      .from("seasons")
      .select("*")
      .order("number", { ascending: false })
      .limit(1);
    season = seasons?.[0] ?? null;
    if (season) {
      const { data } = await supabase
        .from("castaways")
        .select("*")
        .eq("season_id", season.id)
        .order("name");
      castaways = data ?? [];
    }
  } catch {
    // No Supabase env vars in local dev — show placeholder
  }

  return (
    <div className="min-h-screen bg-parchment">
      <PublicNav />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-jungle mb-2">
          {season ? `Season ${season.number} Cast` : "Season 50 Cast"}
        </h1>
        <p className="text-jungle-mid mb-10">
          {season?.name ?? "Loading cast data..."}
        </p>

        {castaways.length === 0 ? (
          <div className="text-jungle-mid text-center py-16 bg-sand rounded-xl">
            Cast data not yet loaded. Connect Supabase and seed Season 50 castaways.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {castaways.map((c) => (
              <CastawayCard key={c.id} castaway={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CastawayCard({ castaway }: { castaway: Castaway }) {
  return (
    <div className={`rounded-xl overflow-hidden border border-sand-dark bg-white ${castaway.is_eliminated ? "opacity-50" : ""}`}>
      <div className="aspect-square bg-sand-dark relative">
        {castaway.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={castaway.image_url} alt={castaway.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-jungle-mid">
            {castaway.name[0]}
          </div>
        )}
        {castaway.is_eliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-xs font-semibold bg-torch px-2 py-0.5 rounded">Out</span>
          </div>
        )}
      </div>
      <div className="p-2 text-center">
        <p className="text-sm font-semibold text-jungle truncate">{castaway.name}</p>
        {castaway.tribe && <p className="text-xs text-jungle-mid">{castaway.tribe}</p>}
      </div>
    </div>
  );
}

function PublicNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-sand-dark bg-white">
      <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2 text-jungle">
        <Flame className="text-torch" size={20} />
        Tribal Ledger
      </Link>
      <div className="flex gap-4 text-sm items-center text-jungle">
        <Link href="/how-to-play" className="hover:text-torch transition-colors">How to Play</Link>
        <Link href="/rules" className="hover:text-torch transition-colors">Rules</Link>
        <Link href="/cast" className="font-medium text-torch">Cast</Link>
        <Link href="/sign-in" className="hover:text-torch transition-colors">Sign In</Link>
        <Link href="/sign-up" className="bg-torch text-white px-4 py-1.5 rounded-md hover:bg-torch-dark transition-colors">
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
