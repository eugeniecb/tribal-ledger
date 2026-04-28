// ---- Shared domain types ----

export type Role = "owner" | "member";
export type ScoreSource = "castaway" | "wager" | "sole_survivor";
export type DraftStatus = "pending" | "approved";

export interface Profile {
  id: string; // Clerk user id
  display_name: string;
  email: string;
  created_at: string;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  total_episodes: number;
  fsg_recap_url: string;
  episode_lock_weekday: number; // 0=Sun ... 6=Sat
  episode_lock_hour_et: number; // 20 = 8pm
}

export interface Castaway {
  id: string;
  season_id: string;
  name: string;
  image_url: string | null;
  tribe: string | null;
  is_eliminated: boolean;
  eliminated_episode: number | null;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  season_id: string;
  owner_id: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  profile_id: string;
  role: Role;
  castaway_points: number;
  vote_points: number;
  joined_at: string;
}

export interface PreferenceRanking {
  id: string;
  member_id: string;
  castaway_id: string;
  rank: number; // 1 = most preferred
}

export interface TeamAssignment {
  id: string;
  member_id: string;
  castaway_id: string;
  slot: 1 | 2;
}

export interface WeeklyWager {
  id: string;
  member_id: string;
  episode_number: number;
  // castaway_id -> points from weekly budget
  budget_allocations: Record<string, number>;
  // castaway_id -> earned vote points wagered
  extra_wagers: Record<string, number>;
  submitted_at: string;
  locked: boolean;
}

export interface SoleSurvivorPick {
  id: string;
  member_id: string;
  castaway_id: string;
  selected_at_episode: number;
  active: boolean;
  created_at: string;
}

// ---- FSG parser output ----

export interface CastawayEvent {
  castawayName: string;
  eventKey: string;
  sourcePoints: number; // FSG's own point value (stored for reference only)
}

export interface EpisodeFacts {
  episodeNumber: number;
  votedOutNames: string[];
  events: CastawayEvent[];
}

// ---- Scoring engine ----

export type ScoringRules = Record<string, number>;

export interface MemberDelta {
  memberId: string;
  deltaCastawayPoints: number;
  deltaVotePoints: number;
  breakdown: DeltaBreakdownItem[];
}

export interface DeltaBreakdownItem {
  source: ScoreSource;
  castawayName?: string;
  reason: string;
  delta: number; // +/-
}

// ---- Score draft ----

export interface ScoreDraft {
  id: string;
  league_id: string;
  episode_import_id: string;
  status: DraftStatus;
  deltas: MemberDelta[];
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface EpisodeImport {
  id: string;
  season_id: string;
  episode_number: number;
  raw_facts: EpisodeFacts;
  source_url: string;
  imported_at: string;
}

// ---- Assignment algorithm ----

export interface AssignmentInput {
  members: { id: string; display_name: string }[];
  castaways: { id: string; name: string }[];
  rankings: { member_id: string; castaway_id: string; rank: number }[];
}

export interface AssignmentResult {
  assignments: { member_id: string; castaway_id: string; slot: 1 | 2 }[];
  hasDuplicates: boolean;
}
