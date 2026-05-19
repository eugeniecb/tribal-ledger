import { createUserClient } from "@/lib/supabase/server";
import { parseLeagueRuleSet } from "@/lib/rules";
import LeagueSideNav from "./LeagueSideNav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}

export default async function LeagueLayout({ children, params }: Props) {
  const { leagueId } = await params;
  const supabase = await createUserClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("rule_set, assignment_locked_at")
    .eq("id", leagueId)
    .single();
  const { data: myMember } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .maybeSingle();
  const rules = parseLeagueRuleSet((league as any)?.rule_set);
  const isAdmin = myMember?.role === "owner";

  const navLinks: { href: string; label: string; icon: "standings" | "team" | "rankings" | "wager" | "sole_survivor" | "admin" | "recap" | "rules" }[] = [
    { href: `/l/${leagueId}`, label: "Standings", icon: "standings" },
    { href: `/l/${leagueId}/team`, label: "Team", icon: "team" },
    { href: `/l/${leagueId}/rules`, label: "League Rules", icon: "rules" },
    { href: `/l/${leagueId}/recap`, label: "Recap", icon: "recap" },
  ];
  if (!league?.assignment_locked_at) {
    navLinks.splice(2, 0, { href: `/l/${leagueId}/rank`, label: "Rankings", icon: "rankings" });
  }
  if (rules.wagers_enabled) navLinks.splice(3, 0, { href: `/l/${leagueId}/wager`, label: "Wager", icon: "wager" });
  if (rules.sole_survivor_enabled) navLinks.splice(rules.wagers_enabled ? 4 : 3, 0, { href: `/l/${leagueId}/sole-survivor`, label: "Sole Survivor", icon: "sole_survivor" });
  if (isAdmin) navLinks.push({ href: `/l/${leagueId}/admin`, label: "Admin", icon: "admin" });

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <aside className="md:w-52 flex-shrink-0 bg-jungle border-b md:border-b-0 md:border-r border-jungle-mid/40">
        <LeagueSideNav links={navLinks} />
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
