"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function LeagueSideNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto md:overflow-x-visible">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href.endsWith("/latest") && pathname.startsWith(href.replace("/latest", "")));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
              isActive ? "bg-torch text-white font-medium" : "text-sand/70 hover:bg-white/10 hover:text-sand"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
