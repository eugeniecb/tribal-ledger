import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shuffle } from "lucide-react";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  const { data: myMember } = await supabase
    .from("league_members")
    .select("id, role, castaway_points")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();

  if (!myMember) notFound();

  const { data: assignments } = await supabase
    .from("team_assignments")
    .select("slot, castaways(id, name, image_url, tribe, is_eliminated)")
    .eq("member_id", myMember.id)
    .order("slot");

  const { data: league } = await supabase
    .from("leagues")
    .select("assignment_locked_at, season_id")
    .eq("id", leagueId)
    .single();

  const isAdmin = myMember.role === "owner";
  const canRunAssignment = isAdmin && !league?.assignment_locked_at;
  let rankingStatus: { complete: boolean; expectedCount: number; incompleteMembers: string[] } | null = null;

  if (isAdmin && league?.season_id) {
    const [{ count: expectedCount }, { data: membersData }] = await Promise.all([
      supabase
        .from("castaways")
        .select("*", { count: "exact", head: true })
        .eq("season_id", league.season_id),
      supabase
        .from("league_members")
        .select("id, profile_id, tribe_name, profiles(display_name)")
        .eq("league_id", leagueId),
    ]);

    const expected = expectedCount ?? 0;
    const memberIds = (membersData ?? []).map((member: any) => member.id);
    const { data: rankingsData } = memberIds.length
      ? await supabase.from("preference_rankings").select("member_id").in("member_id", memberIds)
      : { data: [] as any[] };
    const rankingCounts = new Map<string, number>();
    for (const row of rankingsData ?? []) {
      const memberId = (row as any).member_id as string;
      rankingCounts.set(memberId, (rankingCounts.get(memberId) ?? 0) + 1);
    }

    const incompleteMembers = (membersData ?? [])
      .filter((member: any) => (rankingCounts.get(member.id) ?? 0) < expected)
      .map((member: any) => member.tribe_name ?? member.profiles?.display_name ?? member.profile_id ?? "Unknown member");

    rankingStatus = {
      complete: incompleteMembers.length === 0,
      expectedCount: expected,
      incompleteMembers,
    };
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-jungle">My Team</h1>
          <p className="text-jungle-mid mt-1 text-sm">Your 2 assigned castaways</p>
        </div>
        {canRunAssignment && (
          <form action={`/api/assignments/run`} method="POST">
            <input type="hidden" name="leagueId" value={leagueId} />
            <button
              type="submit"
              className="flex items-center gap-2 border border-jungle text-jungle px-4 py-2 rounded-lg text-sm hover:bg-sand transition-colors"
            >
              <Shuffle size={14} /> Run Assignment
            </button>
          </form>
        )}
      </div>
      {isAdmin && league?.assignment_locked_at && (
        <p className="text-xs text-jungle-mid mb-6">
          Team assignments were finalized on {new Date(league.assignment_locked_at).toLocaleDateString()} and cannot be run again.
        </p>
      )}
      {isAdmin && rankingStatus && (
        <div className="mb-6 rounded-xl border border-sand-dark bg-white p-4">
          <p className="text-sm font-semibold text-jungle">
            Ranking status: {rankingStatus.complete ? "Ready to run assignment" : "Waiting on rankings"}
          </p>
          <p className="text-xs text-jungle-mid mt-1">
            Each member should submit {rankingStatus.expectedCount} ranked castaways.
          </p>
          {!rankingStatus.complete && (
            <div className="mt-3">
              <p className="text-xs font-medium text-jungle mb-1">Still missing rankings:</p>
              <ul className="list-disc pl-5 text-xs text-jungle-mid space-y-0.5">
                {rankingStatus.incompleteMembers.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!assignments || assignments.length === 0 ? (
        <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
          <p className="font-medium mb-1">No team assigned yet</p>
          <p className="text-sm mb-4">The league admin will run the team assignment after everyone has ranked their castaways.</p>
          <Link href={`/l/${leagueId}/rank`} className="text-torch underline text-sm">
            Set your rankings first
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {(assignments as any[]).map((a) => {
            const c = a.castaways;
            return (
              <div key={a.slot} className={`rounded-xl border border-sand-dark overflow-hidden bg-white ${c.is_eliminated ? "opacity-60" : ""}`}>
                <div className="aspect-square bg-sand-dark relative">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt={c.name} className="w-full h-full object-cover object-[50%_20%]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-jungle-mid">
                      {c.name[0]}
                    </div>
                  )}
                  {c.is_eliminated && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-sm font-semibold bg-torch px-3 py-1 rounded">Voted Out</span>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <p className="font-bold text-jungle text-lg">{c.name}</p>
                  {c.tribe && <p className="text-xs text-jungle-mid mt-0.5">{c.tribe}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
