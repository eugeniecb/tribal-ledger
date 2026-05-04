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

  const isAdmin = myMember.role === "owner";

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-jungle">My Team</h1>
          <p className="text-jungle-mid mt-1 text-sm">Your 2 assigned castaways</p>
        </div>
        {isAdmin && (
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

      <p className="text-xs text-jungle-mid mt-8">
        Team assignment points: <strong>{myMember.castaway_points}</strong>
      </p>
    </div>
  );
}
