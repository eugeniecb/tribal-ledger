import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Copy, Zap } from "lucide-react";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function LeagueHomePage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();

  const supabase = await createUserClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code, season_id")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const { data: members } = await supabase
    .from("league_members")
    .select("id, profile_id, role, castaway_points, vote_points, profiles(display_name)")
    .eq("league_id", leagueId)
    .order("castaway_points", { ascending: false });

  const myMember = members?.find((m: any) => m.profile_id === userId);
  const isAdmin = myMember?.role === "owner";

  const sorted = (members ?? []).slice().sort((a: any, b: any) => {
    const totalB = b.castaway_points + b.vote_points;
    const totalA = a.castaway_points + a.vote_points;
    if (totalB !== totalA) return totalB - totalA;
    return b.castaway_points - a.castaway_points;
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-jungle">{league.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-jungle-mid">
            Invite code:
            <code className="bg-sand px-2 py-0.5 rounded font-mono tracking-widest text-jungle">
              {league.invite_code}
            </code>
            <CopyButton code={league.invite_code} />
          </div>
        </div>
        {isAdmin && (
          <Link href={`/l/${leagueId}/admin`} className="text-sm text-torch underline">
            Admin panel
          </Link>
        )}
      </div>

      {/* Standings */}
      <section>
        <h2 className="text-lg font-semibold text-jungle mb-4">Standings</h2>
        <div className="rounded-xl border border-sand-dark overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand border-b border-sand-dark">
              <tr>
                <th className="text-left px-4 py-2.5 text-jungle font-medium w-8">#</th>
                <th className="text-left px-4 py-2.5 text-jungle font-medium">Player</th>
                <th className="text-right px-4 py-2.5 text-jungle font-medium">Cast Pts</th>
                <th className="text-right px-4 py-2.5 text-jungle font-medium">Vote Pts</th>
                <th className="text-right px-4 py-2.5 text-jungle font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((member: any, i: number) => {
                const isMe = member.profile_id === userId;
                return (
                  <tr key={member.id} className={`border-b border-sand-dark last:border-0 ${isMe ? "bg-sand/60" : "bg-white hover:bg-sand/40"}`}>
                    <td className="px-4 py-3 text-jungle-mid">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-jungle">
                      {member.profiles?.display_name ?? "—"}
                      {isMe && <span className="ml-1.5 text-xs text-torch">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-jungle-mid">{member.castaway_points}</td>
                    <td className="px-4 py-3 text-right text-jungle-mid">{member.vote_points}</td>
                    <td className="px-4 py-3 text-right font-bold text-jungle">{member.castaway_points + member.vote_points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 flex gap-3">
        <Link href={`/l/${leagueId}/wager`} className="flex items-center gap-2 bg-torch text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-torch-dark transition-colors text-sm">
          <Zap size={15} /> Place Wager
        </Link>
      </div>
    </div>
  );
}

function CopyButton({ code }: { code: string }) {
  // Client component inline for simplicity
  return (
    <button
      onClick={() => navigator.clipboard.writeText(code)}
      className="text-jungle-mid hover:text-torch transition-colors"
      title="Copy invite code"
    >
      <Copy size={13} />
    </button>
  );
}
