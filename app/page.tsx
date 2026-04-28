import Link from "next/link";
import { Flame, Users, Trophy, Scroll } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-jungle text-sand">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-jungle-mid">
        <span className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Flame className="text-torch" size={22} />
          Tribal Ledger
        </span>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/how-to-play" className="hover:text-torch transition-colors">How to Play</Link>
          <Link href="/rules" className="hover:text-torch transition-colors">Rules</Link>
          <Link href="/cast" className="hover:text-torch transition-colors">Cast</Link>
          <Link href="/sign-in" className="hover:text-torch transition-colors">Sign In</Link>
          <Link href="/sign-up" className="bg-torch text-white px-4 py-1.5 rounded-md hover:bg-torch-dark transition-colors">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Outwit. Outplay. Out<span className="text-torch">wager</span>.
        </h1>
        <p className="text-sand-dark text-lg mb-10 max-w-xl mx-auto">
          Run a private Survivor fantasy league with your friends. Auto-assigned castaway teams, weekly wagers, and a Sole Survivor pick that rewards commitment.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/sign-up" className="bg-torch text-white px-8 py-3 rounded-lg font-semibold hover:bg-torch-dark transition-colors text-lg">
            Start a League
          </Link>
          <Link href="/how-to-play" className="border border-sand text-sand px-8 py-3 rounded-lg font-semibold hover:bg-jungle-mid transition-colors text-lg">
            How It Works
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-24 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Users size={28} className="text-torch" />}
          title="Private Leagues"
          body="Create a league and invite your friends with a code. Everyone has their own castaway team and weekly budget."
        />
        <FeatureCard
          icon={<Flame size={28} className="text-torch" />}
          title="Weekly Wagers"
          body="Split your 10-point budget across castaways you think will be voted out. Plus risk your earned points for a 2x return."
        />
        <FeatureCard
          icon={<Trophy size={28} className="text-torch" />}
          title="Sole Survivor Pick"
          body="Pick who wins the season. The earlier you commit, the more points you earn. Change any time — but your payout shrinks."
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-jungle-mid px-6 py-6 text-center text-sm text-sand-dark">
        <div className="flex justify-center gap-6 mb-2">
          <Link href="/rules" className="hover:text-torch transition-colors flex items-center gap-1">
            <Scroll size={14} /> Rules
          </Link>
          <Link href="/how-to-play" className="hover:text-torch transition-colors">How to Play</Link>
          <Link href="/cast" className="hover:text-torch transition-colors">Season 50 Cast</Link>
        </div>
        Tribal Ledger — not affiliated with CBS or Survivor.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-jungle-mid rounded-xl p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sand-dark text-sm leading-relaxed">{body}</p>
    </div>
  );
}
