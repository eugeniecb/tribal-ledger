import Link from "next/link";
import { BarChart2, Users, ListOrdered, Zap, Star, Shield, ScrollText } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}

export default async function LeagueLayout({ children, params }: Props) {
  const { leagueId } = await params;

  const navLinks = [
    { href: `/l/${leagueId}`, label: "Standings", icon: BarChart2 },
    { href: `/l/${leagueId}/team`, label: "Team", icon: Users },
    { href: `/l/${leagueId}/rank`, label: "Rankings", icon: ListOrdered },
    { href: `/l/${leagueId}/wager`, label: "Wager", icon: Zap },
    { href: `/l/${leagueId}/sole-survivor`, label: "Sole Survivor", icon: Star },
    { href: `/l/${leagueId}/recap/latest`, label: "Recap", icon: ScrollText },
    { href: `/l/${leagueId}/admin`, label: "Admin", icon: Shield },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <aside className="md:w-52 flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-sand-dark">
        <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto md:overflow-x-visible">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-jungle-mid hover:bg-sand hover:text-jungle transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
