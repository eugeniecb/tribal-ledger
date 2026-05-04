import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Flame } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-sand-dark px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2 text-jungle">
            <Flame className="text-torch" size={18} />
            Tribal Ledger
          </Link>
        </div>
        <div className="shrink-0 flex items-center gap-4 md:gap-6">
          <nav className="hidden md:flex items-center gap-4 text-sm text-jungle-mid">
            <Link href="/dashboard" className="hover:text-torch transition-colors">Dashboard</Link>
            <Link href="/how-to-play" className="hover:text-torch transition-colors">How to Play</Link>
            <Link href="/rules" className="hover:text-torch transition-colors">Rules</Link>
            <Link href="/cast" className="hover:text-torch transition-colors">Cast</Link>
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
