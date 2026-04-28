import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Plus, LogIn, Trophy } from "lucide-react";
import { createUserClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  let leagues: { id: string; name: string; invite_code: string; castaway_points: number; vote_points: number }[] = [];
  let error = false;

  try {
    const supabase = await createUserClient();
    const { data, error: dbError } = await supabase
      .from("league_members")
      .select("league_id, castaway_points, vote_points, leagues(id, name, invite_code)")
      .eq("profile_id", userId!);

    if (!dbError && data) {
      leagues = data.map((row: any) => ({
        id: row.leagues.id,
        name: row.leagues.name,
        invite_code: row.leagues.invite_code,
        castaway_points: row.castaway_points,
        vote_points: row.vote_points,
      }));
    }
  } catch {
    error = true;
  }

  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Player";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-jungle">Welcome back, {displayName}</h1>
        <p className="text-jungle-mid mt-1">Your active leagues</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Could not connect to database. Make sure your Supabase environment variables are set.
        </div>
      )}

      <div className="grid gap-4 mb-8">
        {leagues.length === 0 && !error ? (
          <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
            <Trophy size={32} className="mx-auto mb-3 text-torch opacity-50" />
            <p className="font-medium mb-1">No leagues yet</p>
            <p className="text-sm">Create a new league or join one with an invite code.</p>
          </div>
        ) : (
          leagues.map((league) => (
            <Link key={league.id} href={`/l/${league.id}`} className="block bg-white border border-sand-dark rounded-xl p-5 hover:border-torch transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-jungle text-lg group-hover:text-torch transition-colors">{league.name}</h2>
                  <p className="text-xs text-jungle-mid mt-0.5">Code: <code className="bg-sand px-1 rounded">{league.invite_code}</code></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-jungle">{league.castaway_points + league.vote_points}</p>
                  <p className="text-xs text-jungle-mid">total pts</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

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
