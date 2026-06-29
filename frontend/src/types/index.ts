export type UserRole = 'admin' | 'helper' | 'visitor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assigned_sport_id?: string;
  assigned_sport_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Sport {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  scoring_unit: string;
  team_count?: number;
  player_count?: number;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  sport_id: string;
  sport_name?: string;
  logo_url?: string;
  player_count?: number;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  team_name?: string;
  team_logo?: string;
  sport_id: string;
  sport_name?: string;
  position?: string;
  jersey_number?: number;
  age?: number;
  photo_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerStat {
  id: string;
  player_id: string;
  season: string;
  matches_played: number;
  goals_or_points: number;
  assists: number;
  wins: number;
  losses: number;
  extra_stats: Record<string, unknown>;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface Match {
  id: string;
  sport_id: string;
  sport_name?: string;
  sport_logo?: string;
  scoring_unit?: string;
  team_home_id: string;
  home_name?: string;
  home_logo?: string;
  team_away_id: string;
  away_name?: string;
  away_logo?: string;
  venue?: string;
  scheduled_at: string;
  status: MatchStatus;
  score_home: number;
  score_away: number;
  winner_team_id?: string;
  winner_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScoreEvent {
  id: string;
  match_id: string;
  player_id?: string;
  player_name?: string;
  player_photo?: string;
  team_id: string;
  team_name?: string;
  event_type: string;
  description?: string;
  minute?: number;
  score_home_at_event: number;
  score_away_at_event: number;
  created_at: string;
}

export interface InsightOverview {
  total_sports: number;
  total_matches: number;
  total_players: number;
  live_matches: number;
}

export interface TeamStat {
  id: string;
  name: string;
  logo_url?: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  photo_url?: string;
  team_name: string;
  sport_name: string;
  total_points: number;
  total_assists: number;
  matches_played: number;
  wins: number;
}

// ── TOURNAMENTS ──────────────────────────────────────────────
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  sport_id: string;
  sport_name?: string;
  sport_logo?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  start_date?: string;
  end_date?: string;
  venue?: string;
  description?: string;
  prize?: string;
  team_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_id: string;
  team_name: string;
  team_logo?: string;
  seed: number;
  group_name?: string;
}

export interface BracketMatch {
  id: string;
  tournament_id: string;
  round_id: string;
  round_number: number;
  round_name: string;
  match_id?: string;
  slot_number: number;
  team_home_id?: string;
  home_name?: string;
  home_logo?: string;
  team_away_id?: string;
  away_name?: string;
  away_logo?: string;
  winner_id?: string;
  winner_name?: string;
  score_home?: number;
  score_away?: number;
  match_status?: string;
  scheduled_at?: string;
  venue?: string;
  next_match_slot?: number;
}

export interface BracketRound {
  id: string;
  round_number: number;
  round_name: string;
  matches: BracketMatch[];
}
