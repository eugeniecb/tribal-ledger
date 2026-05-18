import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ leagueId: string }>;
}

export default async function RecapIndexPage({ params }: Props) {
  const { leagueId } = await params;
  const { userId } = await auth();
  const supabase = await createUserClient();

  const { data: myMember } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("profile_id", userId!)
    .single();
  if (!myMember) notFound();

  const { data: league } = await supabase.from("leagues").select("season_id").eq("id", leagueId).single();
  if (!league) notFound();

  const { data: episodeImports } = await supabase
    .from("episode_imports")
    .select("episode_number, imported_at")
    .eq("season_id", league.season_id)
    .order("episode_number", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-jungle mb-1">Season Recaps</h1>
      <p className="text-jungle-mid text-sm mb-8">All imported episodes for this season.</p>

      {!episodeImports?.length && (
        <div className="text-center py-16 bg-sand rounded-xl border border-sand-dark text-jungle-mid">
          No recaps imported yet.
        </div>
      )}

      {!!episodeImports?.length && (
        <div className="rounded-xl border border-sand-dark overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand border-b border-sand-dark">
              <tr>
                <th className="text-left px-4 py-2 text-jungle">Episode</th>
                <th className="text-left px-4 py-2 text-jungle">Imported</th>
                <th className="text-right px-4 py-2 text-jungle">View</th>
              </tr>
            </thead>
            <tbody>
              {episodeImports.map((ep, i) => (
                <tr key={ep.episode_number} className="border-b border-sand-dark last:border-0 hover:bg-sand/40">
                  <td className="px-4 py-2 text-jungle font-medium">Episode {ep.episode_number}</td>
                  <td className="px-4 py-2 text-jungle-mid">{new Date(ep.imported_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/l/${leagueId}/recap/${ep.episode_number}`}
                      className="text-torch font-medium hover:underline"
                    >
                      {i === 0 ? "Latest" : "Open"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
