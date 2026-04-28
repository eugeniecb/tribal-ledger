import Link from "next/link";
import { Flame, Users, Zap, Star } from "lucide-react";

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-parchment">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-jungle mb-2">How to Play</h1>
        <p className="text-jungle-mid mb-12 text-lg">Everything you need to know to compete.</p>

        <Step
          number={1}
          icon={<Users className="text-torch" size={22} />}
          title="Create or join a league"
          body="Sign up and create a private league, then share your invite code with friends. Or use a code someone sent you to join their league."
        />
        <Step
          number={2}
          icon={<Flame className="text-torch" size={22} />}
          title="Rank the castaways"
          body="Before teams are assigned, drag castaways into your personal preference order. The algorithm assigns 2 castaways per person, maximizing the worst member's pair-score first so no one gets stuck with all their last choices."
        />
        <Step
          number={3}
          icon={<Zap className="text-torch" size={22} />}
          title="Wager each week"
          body="Every week you get 10 free budget points to split across castaways you think will be voted out. Correct? Earn those points. Wrong? They disappear (they were free). You can also risk points you've already earned for a doubled return — or lose them."
        />
        <Step
          number={4}
          icon={<Star className="text-torch" size={22} />}
          title="Pick your Sole Survivor"
          body="Pick who you think wins the whole season. Pick in episode 1 and never change → maximum 13 bonus points if correct. Change your pick later and the payout shrinks. If your pick gets voted out you must pick again."
        />

        <div className="mt-12 flex gap-4">
          <Link href="/rules" className="bg-torch text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-torch-dark transition-colors">
            Full Rules
          </Link>
          <Link href="/sign-up" className="border border-jungle text-jungle px-6 py-2.5 rounded-lg font-semibold hover:bg-sand transition-colors">
            Start Playing
          </Link>
        </div>
      </main>
    </div>
  );
}

function Step({ number, icon, title, body }: { number: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-5 mb-10">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-jungle flex items-center justify-center text-sand font-bold text-sm">
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="font-semibold text-lg text-jungle">{title}</h2>
        </div>
        <p className="text-jungle-mid leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function PublicNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-sand-dark bg-white">
      <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2 text-jungle">
        <Flame className="text-torch" size={20} />
        Tribal Ledger
      </Link>
      <div className="flex gap-4 text-sm items-center text-jungle">
        <Link href="/how-to-play" className="font-medium text-torch">How to Play</Link>
        <Link href="/rules" className="hover:text-torch transition-colors">Rules</Link>
        <Link href="/cast" className="hover:text-torch transition-colors">Cast</Link>
        <Link href="/sign-in" className="hover:text-torch transition-colors">Sign In</Link>
        <Link href="/sign-up" className="bg-torch text-white px-4 py-1.5 rounded-md hover:bg-torch-dark transition-colors">
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
