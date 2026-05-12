import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Plus, LogIn, Trophy } from "lucide-react";
import { createUserClient } from "@/lib/supabase/server";
import TrashTalkBanner from "./TrashTalkBanner";

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
  let trashTalkBanner:
    | {
        messageId: string;
        message: string;
        senderName: string;
        leagueName: string;
      }
    | null = null;

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
        id: row.leagues.id,
        name: row.leagues.name,
        invite_code: row.leagues.invite_code,
        castaway_points: row.castaway_points,
        vote_points: row.vote_points,
        role: row.role,
        archived_at: row.leagues.archived_at ?? null,
      }));

      const recipientMemberIds = data.map((row: any) => row.id).filter(Boolean);
      if (recipientMemberIds.length > 0) {
        const { data: pendingMessages } = await supabase
          .from("trash_talk_messages")
          .select("id, message, created_at, league_id, sender_member_id, recipient_member_id")
          .in("recipient_member_id", recipientMemberIds)
          .is("dismissed_at", null)
          .order("created_at", { ascending: false })
          .limit(1);

        const latest = pendingMessages?.[0];
        if (latest) {
          const [{ data: sender }, { data: leagueRow }] = await Promise.all([
            supabase
              .from("league_members")
              .select("tribe_name, profile_id, profiles(display_name)")
              .eq("id", (latest as any).sender_member_id)
              .maybeSingle(),
            supabase
              .from("leagues")
              .select("name")
              .eq("id", (latest as any).league_id)
              .maybeSingle(),
          ]);

          trashTalkBanner = {
            messageId: (latest as any).id,
            message: (latest as any).message,
            senderName: (sender as any)?.tribe_name ?? (sender as any)?.profiles?.display_name ?? (sender as any)?.profile_id ?? "A tribemate",
            leagueName: (leagueRow as any)?.name ?? "Your league",
          };
        }
      }
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

      {trashTalkBanner && (
        <TrashTalkBanner
          messageId={trashTalkBanner.messageId}
          senderName={trashTalkBanner.senderName}
          leagueName={trashTalkBanner.leagueName}
          message={trashTalkBanner.message}
        />
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Could not connect to database. Make sure your Supabase environment variables are set.
        </div>
      )}

      <div className="grid gap-4 mb-8">
        {activeLeagues.length === 0 && !error ? (
          <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
            <Trophy size={32} className="mx-auto mb-3 text-torch opacity-50" />
            <p className="font-medium mb-1">No active leagues</p>
            <p className="text-sm">Create a new league or join one with an invite code.</p>
          </div>
        ) : (
          activeLeagues.map((league) => (
            <div key={league.id} className="block bg-white border border-sand-dark rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <Link href={`/l/${league.id}`} className="group min-w-0">
                  <h2 className="font-semibold text-jungle text-lg group-hover:text-torch transition-colors">{league.name}</h2>
                  <p className="text-xs text-jungle-mid mt-0.5">Code: <code className="bg-sand px-1 rounded">{league.invite_code}</code></p>
                </Link>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-jungle">{league.castaway_points + league.vote_points}</p>
                  <p className="text-xs text-jungle-mid">total pts</p>
                </div>
              </div>
              {league.role === "owner" && (
                <form action={`/api/leagues/${league.id}/archive`} method="POST" className="mt-3">
                  <button
                    type="submit"
                    className="text-xs text-jungle-mid underline hover:text-torch"
                    onClick={(e) => {
                      if (!confirm(`Archive "${league.name}"? You can still view it, but it will move to Archived Leagues.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Archive League
                  </button>
                </form>
              )}
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
