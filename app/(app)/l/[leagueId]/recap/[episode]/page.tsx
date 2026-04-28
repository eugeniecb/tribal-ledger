import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ leagueId: string; episode: string }>;
}

export default async function RecapPage({ params }: Props) {
  const { leagueId, episode } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  // Verify membership
  const { data: myMember } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();

  if (!myMember) notFound();

  // If "latest", redirect to highest episode
  const { data: league } = await supabase
    .from("leagues")
    .select("season_id")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  let episodeNumber: number;
  if (episode === "latest") {
    const { data: latest } = await supabase
      .from("episode_imports")
      .select("episode_number")
      .eq("season_id", league.season_id)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    episodeNumber = latest?.episode_number ?? 1;
  } else {
    episodeNumber = parseInt(episode, 10);
    if (isNaN(episodeNumber)) notFound();
  }

  const { data: importData } = await supabase
    .from("episode_imports")
    .select("id, episode_number, raw_facts, imported_at")
    .eq("season_id", league.season_id)
    .eq("episode_number", episodeNumber)
    .maybeSingle();

  const { data: draft } = await supabase
    .from("score_drafts")
    .select("status, deltas, approved_at")
    .eq("league_id", leagueId)
    .eq("episode_import_id", importData?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  const { data: members } = await supabase
    .from("league_members")
    .select("id, profiles(display_name)")
    .eq("league_id", leagueId);

  const memberMap = new Map((members ?? []).map((m: any) => [m.id, m.profiles?.display_name ?? m.id]));

  const facts = importData?.raw_facts;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-1">Episode {episodeNumber} Recap</h1>
      {importData ? (
        <p className="text-jungle-mid text-sm mb-8">
          Imported {new Date(importData.imported_at).toLocaleDateString()}
        </p>
      ) : (
        <p className="text-jungle-mid text-sm mb-8">No recap imported yet for this episode.</p>
      )}

      {facts && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-jungle mb-3">Episode Facts</h2>
          {facts.votedOutNames?.length > 0 && (
            <div className="mb-3 p-3 bg-torch/10 border border-torch/30 rounded-lg text-sm text-jungle">
              <strong>Voted out:</strong> {facts.votedOutNames.join(", ")}
            </div>
          )}
          <div className="rounded-xl border border-sand-dark overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sand border-b border-sand-dark">
                <tr>
                  <th className="text-left px-4 py-2 text-jungle">Castaway</th>
                  <th className="text-left px-4 py-2 text-jungle">Event</th>
                  <th className="text-right px-4 py-2 text-jungle">FSG Pts</th>
                </tr>
              </thead>
              <tbody>
                {(facts.events ?? []).map((ev: any, i: number) => (
                  <tr key={i} className="border-b border-sand-dark last:border-0 hover:bg-sand/40">
                    <td className="px-4 py-2 text-jungle">{ev.castawayName}</td>
                    <td className="px-4 py-2 text-jungle-mid capitalize">{ev.eventKey}</td>
                    <td className="px-4 py-2 text-right text-jungle-mid">{ev.sourcePoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {draft && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-jungle">Score Draft</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${draft.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {draft.status === "approved" ? "Approved" : "Pending"}
            </span>
          </div>
          <div className="rounded-xl border border-sand-dark overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sand border-b border-sand-dark">
                <tr>
                  <th className="text-left px-4 py-2 text-jungle">Player</th>
                  <th className="text-right px-4 py-2 text-jungle">Cast Pts</th>
                  <th className="text-right px-4 py-2 text-jungle">Vote Pts</th>
                </tr>
              </thead>
              <tbody>
                {(draft.deltas ?? []).map((d: any, i: number) => (
                  <tr key={i} className={`border-b border-sand-dark last:border-0 ${d.memberId === myMember.id ? "bg-sand/60" : "bg-white"}`}>
                    <td className="px-4 py-2 text-jungle">
                      {memberMap.get(d.memberId) ?? d.memberId}
                      {d.memberId === myMember.id && <span className="ml-1 text-xs text-torch">(you)</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{d.deltaCastawayPoints >= 0 ? "+" : ""}{d.deltaCastawayPoints}</td>
                    <td className="px-4 py-2 text-right">{d.deltaVotePoints >= 0 ? "+" : ""}{d.deltaVotePoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!importData && !draft && (
        <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
          No data imported for episode {episodeNumber} yet.
        </div>
      )}
    </div>
  );
}
