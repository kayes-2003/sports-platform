-- =============================================================
-- TOURNAMENT SYSTEM SCHEMA — matches frontend types.ts exactly
-- Formats: single_elimination, double_elimination, round_robin, group_knockout
-- Run in: Neon Console → SQL Editor
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- 1. TOURNAMENTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  sport_id      UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  format        VARCHAR(25) NOT NULL DEFAULT 'single_elimination'
                CHECK (format IN ('single_elimination','double_elimination','round_robin','group_knockout')),
  status        VARCHAR(20) NOT NULL DEFAULT 'upcoming'
                CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  start_date    DATE,
  end_date      DATE,
  venue         VARCHAR(150),
  description   TEXT,
  prize         VARCHAR(150),
  -- group_knockout config: how many groups, how many advance per group
  group_count          INTEGER DEFAULT 2,
  teams_advance_per_group INTEGER DEFAULT 2,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. TOURNAMENT TEAMS — entered teams, optional seed + group assignment
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed            INTEGER,
  group_name      VARCHAR(10),     -- 'A', 'B', 'C'... only used for group_knockout
  -- standings (round_robin and group stage of group_knockout)
  played          INTEGER DEFAULT 0,
  wins            INTEGER DEFAULT 0,
  losses          INTEGER DEFAULT 0,
  draws           INTEGER DEFAULT 0,
  points          INTEGER DEFAULT 0,
  goal_diff       INTEGER DEFAULT 0,
  UNIQUE (tournament_id, team_id)
);

-- -------------------------------------------------------------
-- 3. TOURNAMENT ROUNDS — groups matches into named rounds for display
--    (e.g. "Group Stage", "Round of 8", "Semifinal", "Final",
--     "Winners Round 1", "Losers Round 1", "Grand Final")
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number    INTEGER NOT NULL,         -- ordering key, unique per bracket_side
  round_name      VARCHAR(60) NOT NULL,     -- display label
  bracket_side    VARCHAR(10) DEFAULT 'main' -- 'main' | 'winners' | 'losers' | 'grand_final' | 'group'
                  CHECK (bracket_side IN ('main','winners','losers','grand_final','group')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_rounds_tournament ON tournament_rounds(tournament_id);

-- -------------------------------------------------------------
-- 4. TOURNAMENT BRACKET MATCHES (the bracket nodes / fixtures)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id          UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  slot_number       INTEGER NOT NULL,         -- position within the round (0-indexed)
  group_name        VARCHAR(10),              -- set for group_knockout group stage matches

  team_home_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_away_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
  winner_id         UUID REFERENCES teams(id) ON DELETE SET NULL,

  score_home        INTEGER,
  score_away        INTEGER,
  match_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (match_status IN ('pending','ready','live','completed','bye')),
  scheduled_at      TIMESTAMPTZ,
  venue             VARCHAR(150),

  match_id          UUID REFERENCES matches(id) ON DELETE SET NULL, -- linked real match once scored in detail

  -- advancement wiring (winner bracket / main bracket / group_knockout knockout stage)
  next_match_id       UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  next_match_slot     INTEGER,  -- matches BracketMatch.next_match_slot in types.ts (0=home,1=away)

  -- double_elimination only: where the LOSER of this match drops to
  loser_next_match_id   UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  loser_next_match_slot INTEGER,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);

-- -------------------------------------------------------------
-- 5. MATCH DETAILS — extend `matches` with rich result info
--    (sport-aware result_summary, MOTM, best scorer)
-- -------------------------------------------------------------
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_summary VARCHAR(255);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS man_of_the_match_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS best_scorer_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS best_scorer_value INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS extra_result_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL;

-- -------------------------------------------------------------
-- 6. SPORTS — result-format hint so backend knows how to phrase results
-- -------------------------------------------------------------
ALTER TABLE sports ADD COLUMN IF NOT EXISTS result_format VARCHAR(20) DEFAULT 'points'
  CHECK (result_format IN ('goals','points','runs_wickets','sets'));

UPDATE sports SET result_format = 'goals'        WHERE name ILIKE 'football';
UPDATE sports SET result_format = 'runs_wickets' WHERE name ILIKE 'cricket';
UPDATE sports SET result_format = 'points'       WHERE name IN ('Basketball','Badminton','Table Tennis');
UPDATE sports SET result_format = 'sets'         WHERE name ILIKE 'volleyball';

SELECT 'tournaments' AS table_name, COUNT(*) FROM tournaments
UNION ALL SELECT 'tournament_teams', COUNT(*) FROM tournament_teams
UNION ALL SELECT 'tournament_rounds', COUNT(*) FROM tournament_rounds
UNION ALL SELECT 'tournament_matches', COUNT(*) FROM tournament_matches;
