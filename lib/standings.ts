// League standings order. Highest total (castaway + vote points) first; ties broken by
// vote points. Members tied on both share a rank, and the next rank skips (1, 1, 3).

export interface StandingsMember {
  castaway_points: number;
  vote_points: number;
}

export type RankedMember<T> = T & { rank: number };

export function rankStandings<T extends StandingsMember>(members: T[]): RankedMember<T>[] {
  const total = (m: StandingsMember) => m.castaway_points + m.vote_points;
  const sorted = members.slice().sort((a, b) => {
    if (total(b) !== total(a)) return total(b) - total(a);
    return b.vote_points - a.vote_points;
  });

  return sorted.map((member, i) => {
    let rank = i + 1;
    // Find the first member in this tie group; everyone in the group takes its position.
    for (let j = i - 1; j >= 0; j--) {
      const prev = sorted[j];
      if (total(prev) !== total(member) || prev.vote_points !== member.vote_points) break;
      rank = j + 1;
    }
    return { ...member, rank };
  });
}
