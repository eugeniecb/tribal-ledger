"use client";

interface Props {
  leagueId: string;
  leagueName: string;
}

export default function ArchiveLeagueButton({ leagueId, leagueName }: Props) {
  return (
    <form action={`/api/leagues/${leagueId}/archive`} method="POST" className="mt-3">
      <button
        type="submit"
        className="text-xs text-jungle-mid underline hover:text-torch"
        onClick={(e) => {
          if (!confirm(`Archive "${leagueName}"? You can still view it, but it will move to Archived Leagues.`)) {
            e.preventDefault();
          }
        }}
      >
        Archive League
      </button>
    </form>
  );
}
