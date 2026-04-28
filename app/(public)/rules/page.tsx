import Link from "next/link";
import { Flame } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-parchment">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-jungle mb-2">Rules</h1>
        <p className="text-jungle-mid mb-12">Detailed scoring and gameplay rules.</p>

        <Section title="Leagues">
          <ul className="list-disc pl-5 space-y-2 text-jungle-mid">
            <li>One player creates a private league and shares the 6-character invite code.</li>
            <li>Friends join using that code before the castaway ranking deadline.</li>
            <li>Each league follows Season 50 of Survivor.</li>
          </ul>
        </Section>

        <Section title="Castaway Teams">
          <ul className="list-disc pl-5 space-y-2 text-jungle-mid">
            <li>Each member ranks all castaways in their personal preference order.</li>
            <li>The algorithm assigns exactly 2 castaways per member.</li>
            <li>It maximizes the fairness of the worst member's pair first, then minimizes duplicates, then maximizes total preference score.</li>
            <li>Your 2 castaways earn castaway points throughout the season based on their in-game actions.</li>
          </ul>
        </Section>

        <Section title="Castaway Scoring (points per event)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-sand border-b border-sand-dark">
                  <th className="text-left px-3 py-2 text-jungle">Event</th>
                  <th className="text-right px-3 py-2 text-jungle">Points</th>
                </tr>
              </thead>
              <tbody>
                {SCORING_TABLE.map(({ event, pts }) => (
                  <tr key={event} className="border-b border-sand-dark hover:bg-sand/50">
                    <td className="px-3 py-2 text-jungle-mid">{event}</td>
                    <td className="px-3 py-2 text-right font-mono text-jungle">{pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Weekly Wagers">
          <ul className="list-disc pl-5 space-y-2 text-jungle-mid">
            <li>Each episode, every member gets a fresh <strong>10-point weekly budget</strong>.</li>
            <li>Allocate any portion of those 10 points across castaways you think will be voted out.</li>
            <li>Correct: earn vote points equal to the amount you allocated.</li>
            <li>Wrong: those allocation points are lost (they were free).</li>
            <li>You may also wager your previously-earned vote points as <strong>extra wagers</strong>.</li>
            <li>Correct extra wager: earn back your stake plus an equal amount in profit (net +wager).</li>
            <li>Wrong extra wager: lose your stake (net −wager).</li>
            <li>You may stack: allocate budget AND extra wager on the same castaway.</li>
            <li>Wagers lock at <strong>Wednesday 8:00 PM ET</strong> (episode airtime). No changes after lock.</li>
          </ul>
        </Section>

        <Section title="Sole Survivor Pick">
          <ul className="list-disc pl-5 space-y-2 text-jungle-mid">
            <li>Pick one castaway you think wins the season.</li>
            <li>You can change your pick any time — but your potential payout decreases.</li>
            <li>At the finale, if your <em>currently active</em> pick is the Sole Survivor, you earn: <code className="bg-sand px-1 rounded text-xs">(total episodes − episode you last picked) + 1</code> vote points.</li>
            <li>Pick in episode 1 and never change → max 13 points.</li>
            <li>If your pick is voted out, you must pick a new castaway. Your payout will be based on when you make that new pick.</li>
            <li>Earlier picks that were voted out pay 0.</li>
          </ul>
        </Section>

        <Section title="Standings">
          <ul className="list-disc pl-5 space-y-2 text-jungle-mid">
            <li>Each member has two point totals: <strong>castaway points</strong> (from your team) and <strong>vote points</strong> (from wagers + Sole Survivor).</li>
            <li>Standings show total combined points. Tiebreaker: castaway points.</li>
          </ul>
        </Section>
      </main>
    </div>
  );
}

const SCORING_TABLE = [
  { event: "Individual immunity win", pts: 5 },
  { event: "Tribe immunity win", pts: 3 },
  { event: "Individual reward win", pts: 2 },
  { event: "Tribe reward win", pts: 2 },
  { event: "Find hidden immunity idol", pts: 3 },
  { event: "Gain advantage", pts: 2 },
  { event: "Voted out", pts: 0 },
  { event: "Quit / medical evac", pts: 0 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-jungle mb-3 pb-1 border-b border-sand-dark">{title}</h2>
      {children}
    </section>
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
        <Link href="/how-to-play" className="hover:text-torch transition-colors">How to Play</Link>
        <Link href="/rules" className="font-medium text-torch">Rules</Link>
        <Link href="/cast" className="hover:text-torch transition-colors">Cast</Link>
        <Link href="/sign-in" className="hover:text-torch transition-colors">Sign In</Link>
        <Link href="/sign-up" className="bg-torch text-white px-4 py-1.5 rounded-md hover:bg-torch-dark transition-colors">
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
