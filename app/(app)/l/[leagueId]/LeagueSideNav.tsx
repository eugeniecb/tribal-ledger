"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Users,
  ListOrdered,
  Zap,
  Star,
  Shield,
  ScrollText,
  Scroll,
} from "lucide-react";

type IconKey =
  | "standings"
  | "team"
  | "rankings"
  | "wager"
  | "sole_survivor"
  | "admin"
  | "recap"
  | "rules";

interface NavLink {
  href: string;
  label: string;
  icon: IconKey;
}

export default function LeagueSideNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const iconMap = {
    standings: BarChart2,
    team: Users,
    rankings: ListOrdered,
    wager: Zap,
    sole_survivor: Star,
    admin: Shield,
    recap: ScrollText,
    rules: Scroll,
  } as const;

  return (
    <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto md:overflow-x-visible">
      {links.map(({ href, label, icon }) => {
        const Icon = iconMap[icon];
        const isActive = pathname === href || (href.endsWith("/latest") && pathname.startsWith(href.replace("/latest", "")));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
              isActive ? "bg-torch text-sand font-semibold" : "text-sand/90 hover:bg-white/15 hover:text-sand"
            }`}
          >
            <Icon size={15} className="opacity-95" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
