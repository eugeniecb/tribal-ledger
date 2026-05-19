import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Plus, LogIn, Flame, ChevronRight } from "lucide-react";
import { createUserClient } from "@/lib/supabase/server";
import ArchiveLeagueButton from "./ArchiveLeagueButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  let leagues: {
    id: string;
    name: string;
    invite_code: string;
    castaway_points: number;
    vote_points: number;
    role: "owner" | "member";
    archived_at: string | null;
  }[] = [];
  let error = false;

  try {
    const supabase = await createUserClient();
    const { data, error: dbError } = await supabase
      .from("league_members")
      .select("id, league_id, role, castaway_points, vote_points, leagues(id, name, invite_code, archived_at)")
      .eq("profile_id", userId!);

    if (dbError) {
      error = true;
    } else if (data) {
      leagues = data.map((row: any) => ({
        id: row.leagues?.id ?? row.league_id,
        name: row.leagues?.name ?? "Unknown League",
        invite_code: row.leagues?.invite_code ?? "—",
        castaway_points: row.castaway_points,
        vote_points: row.vote_points,
        role: row.role,
        archived_at: row.leagues?.archived_at ?? null,
      })).filter((l) => Boolean(l.id));

    }
  } catch {
    error = true;
  }

  const activeLeagues = leagues.filter((l) => !l.archived_at);
  const archivedLeagues = leagues.filter((l) => Boolean(l.archived_at));

  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Player";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-jungle">Welcome back, {displayName}</h1>
        <p className="text-jungle-mid mt-1">Your leagues</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Could not connect to database. Make sure your Supabase environment variables are set.
        </div>
      )}

      <div className="grid gap-4 mb-8">
        {activeLeagues.length === 0 && !error ? (
          <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
            <Flame size={36} className="mx-auto mb-3 text-torch opacity-40" />
            <p className="font-medium mb-1">No active leagues</p>
            <p className="text-sm">Create a new league or join one with an invite code.</p>
          </div>
        ) : (
          activeLeagues.map((league) => (
            <div key={league.id} className="bg-white border border-sand-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-stretch">
                <div className="w-24 bg-jungle flex flex-col items-center justify-center shrink-0">
                  <p className="text-3xl font-bold text-sand">{league.castaway_points + league.vote_points}</p>
                  <p className="text-xs text-sand/60 uppercase tracking-wide">pts</p>
                </div>
                <div className="p-5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/l/${league.id}`} className="group min-w-0">
                        <h2 className="font-semibold text-jungle text-lg group-hover:text-torch transition-colors truncate">{league.name}</h2>
                      </Link>
                      <p className="text-xs text-jungle-mid mt-0.5">
                        Code: <code className="bg-sand px-1.5 py-0.5 rounded font-mono tracking-widest">{league.invite_code}</code>
                      </p>
                      <p className="text-xs text-jungle-mid mt-1">Cast {league.castaway_points} • Vote {league.vote_points}</p>
                      {league.role === "owner" && (
                        <p className="mt-2 text-ember font-semibold uppercase tracking-wide text-xs">Admin</p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-jungle-mid shrink-0 mt-1" />
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4">
                {league.role === "owner" && (
                  <ArchiveLeagueButton leagueId={league.id} leagueName={league.name} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {archivedLeagues.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-jungle mb-3">Archived Leagues</h2>
          <div className="grid gap-3">
            {archivedLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/l/${league.id}`}
                className="block bg-sand/60 border border-sand-dark rounded-xl p-4 hover:border-torch transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-jungle">{league.name}</h3>
                    <p className="text-xs text-jungle-mid mt-0.5">Archived</p>
                  </div>
                  <p className="text-sm font-medium text-jungle">{league.castaway_points + league.vote_points} pts</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/leagues/new" className="flex items-center gap-2 bg-torch text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-torch-dark transition-colors">
          <Plus size={16} /> Create League
        </Link>
        <Link href="/join" className="flex items-center gap-2 border border-jungle text-jungle px-5 py-2.5 rounded-lg font-semibold hover:bg-sand transition-colors">
          <LogIn size={16} /> Join League
        </Link>
      </div>
    </div>
  );
}
