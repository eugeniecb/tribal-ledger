import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Flame } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-sand-dark px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2 text-jungle">
          <Flame className="text-torch" size={18} />
          Tribal Ledger
        </Link>
        <UserButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
