import { auth } from "@clerk/nextjs/server";
import { createUserClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Zap, Flame } from "lucide-react";
import CopyButton from "./CopyButton";
import TrashTalkButton from "./TrashTalkButton";
import TrashTalkBanner from "./TrashTalkBanner";

interface Props {
  params: Promise<{ leagueId: string }>;
}

const RANK_STYLES = [
  "bg-ember text-white",
  "bg-jungle-mid text-sand",
  "bg-ember/60 text-jungle",
] as const;

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
    .select("id, profile_id, tribe_name, role, castaway_points, vote_points, profiles(display_name)")
    .eq("league_id", leagueId)
    .order("castaway_points", { ascending: false });

  const myMember = members?.find((m: any) => m.profile_id === userId);
  if (!myMember) notFound();
  const isAdmin = myMember?.role === "owner";
  const memberIds = (members ?? []).map((m: any) => m.id);

  const { data: soleSurvivorPicks } = memberIds.length
    ? await supabase
        .from("sole_survivor_picks")
        .select("member_id, castaways(name)")
        .in("member_id", memberIds)
        .eq("active", true)
    : { data: [] as any[] };

  const soleSurvivorByMember = new Map<string, string>();
  for (const pick of soleSurvivorPicks ?? []) {
    soleSurvivorByMember.set((pick as any).member_id, (pick as any).castaways?.name ?? "—");
  }

  const { data: teamAssignments } = memberIds.length
    ? await supabase
        .from("team_assignments")
        .select("member_id, slot, castaways(id, name, image_url, is_eliminated)")
        .in("member_id", memberIds)
        .order("slot")
    : { data: [] as any[] };

  const teamByMember = new Map<string, { id: string; name: string; image_url: string | null; is_eliminated: boolean }[]>();
  for (const a of teamAssignments ?? []) {
    const castaway = (a as any).castaways;
    if (!castaway) continue;
    const team = teamByMember.get((a as any).member_id) ?? [];
    team.push(castaway);
    teamByMember.set((a as any).member_id, team);
  }

  let trashTalkBanners: {
    messageId: string;
    senderName: string;
    message: string;
  }[] = [];
  const { data: pendingMessages, error: trashTalkError } = await supabase
    .from("trash_talk_messages")
    .select("id, message, sender_member_id")
    .eq("league_id", leagueId)
    .eq("recipient_member_id", myMember.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (!trashTalkError && pendingMessages?.length) {
    const senderIds = Array.from(new Set((pendingMessages as any[]).map((m: any) => m.sender_member_id)));
    const { data: senders } = await supabase
      .from("league_members")
      .select("id, tribe_name, profile_id, profiles(display_name)")
      .in("id", senderIds);
    const senderById = new Map<string, any>((senders ?? []).map((s: any) => [s.id, s]));

    trashTalkBanners = (pendingMessages as any[]).map((msg: any) => {
      const sender = senderById.get(msg.sender_member_id);
      return {
        messageId: msg.id,
        senderName: sender?.tribe_name ?? sender?.profiles?.display_name ?? sender?.profile_id ?? "A tribemate",
        message: msg.message,
      };
    });
  }

  const sorted = (members ?? []).slice().sort((a: any, b: any) => {
    const totalB = b.castaway_points + b.vote_points;
    const totalA = a.castaway_points + a.vote_points;
    if (totalB !== totalA) return totalB - totalA;
    return b.castaway_points - a.castaway_points;
  });
  const myRank = sorted.findIndex((m: any) => m.profile_id === userId) + 1;

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
          {myRank > 0 && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full text-xs font-bold ${
                  myRank <= 3 ? RANK_STYLES[myRank - 1] : "bg-sand text-jungle-mid"
                }`}
              >
                #{myRank}
              </span>
            </div>
          )}
        </div>
        {isAdmin && (
          <Link href={`/l/${leagueId}/admin`} className="text-sm text-torch underline">
            Admin panel
          </Link>
        )}
      </div>

      {trashTalkBanners.map((banner) => (
        <TrashTalkBanner
          key={banner.messageId}
          messageId={banner.messageId}
          senderName={banner.senderName}
          message={banner.message}
        />
      ))}

      {/* Standings */}
      <section>
        <h2 className="text-lg font-semibold text-jungle mb-4">Standings</h2>
        <div className="rounded-xl border border-sand-dark overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-jungle border-b border-jungle-mid/40 text-sand/70 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium w-8">#</th>
                <th className="text-left px-4 py-2.5 font-medium">Player</th>
                <th className="text-right px-4 py-2.5 font-medium">Cast Pts</th>
                <th className="text-right px-4 py-2.5 font-medium">Vote Pts</th>
                <th className="text-left px-4 py-2.5 font-medium">Sole Survivor</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((member: any, i: number) => {
                const isMe = member.profile_id === userId;
                return (
                  <tr key={member.id} className={`border-b border-sand-dark last:border-0 ${isMe ? "bg-torch/5" : "bg-white hover:bg-sand/40"}`}>
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${RANK_STYLES[i]}`}>{i + 1}</span>
                      ) : (
                        <span className="text-jungle-mid text-xs">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-jungle">
                      {i === 0 && <Flame size={13} className="text-torch inline-block mr-1.5" />}
                      {member.tribe_name ?? member.profiles?.display_name ?? "—"}
                      {member.tribe_name && (
                        <span className="ml-1.5 font-normal text-jungle-mid">
                          ({member.profiles?.display_name ?? "—"})
                        </span>
                      )}
                      {isMe && <span className="ml-1.5 text-xs text-torch">(you)</span>}
                      <TeamChips team={teamByMember.get(member.id) ?? []} />
                    </td>
                    <td className="px-4 py-3 text-right text-jungle-mid">{member.castaway_points}</td>
                    <td className="px-4 py-3 text-right text-jungle-mid">{member.vote_points}</td>
                    <td className="px-4 py-3 text-jungle-mid">{soleSurvivorByMember.get(member.id) ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-jungle text-base">{member.castaway_points + member.vote_points}</td>
                    <td className="px-4 py-3">
                      {!isMe ? (
                        <TrashTalkButton
                          leagueId={leagueId}
                          recipientMemberId={member.id}
                          recipientName={member.tribe_name ?? member.profiles?.display_name ?? "player"}
                        />
                      ) : (
                        <span className="text-xs text-jungle-mid">—</span>
                      )}
                    </td>
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

function TeamChips({ team }: { team: { id: string; name: string; image_url: string | null; is_eliminated: boolean }[] }) {
  if (!team.length) return <p className="mt-1 text-xs font-normal text-jungle-mid/70">Team TBD</p>;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {team.map((c) => (
        <span
          key={c.id}
          title={c.is_eliminated ? `${c.name} (voted out)` : c.name}
          className={`inline-flex items-center gap-1.5 rounded-full bg-sand py-0.5 pl-0.5 pr-2 text-xs font-normal ${
            c.is_eliminated ? "opacity-60" : ""
          }`}
        >
          {c.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image_url}
              alt=""
              className={`h-6 w-6 rounded-full object-cover object-[50%_20%] ${c.is_eliminated ? "grayscale" : ""}`}
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand-dark text-[10px] font-bold text-jungle-mid">
              {c.name[0]}
            </span>
          )}
          <span className={c.is_eliminated ? "text-jungle-mid line-through" : "text-jungle"}>{c.name}</span>
        </span>
      ))}
    </div>
  );
}
