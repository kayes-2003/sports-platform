const pool = require('../config/db');

// GET /api/tournaments
const getTournaments = async (req, res, next) => {
  try {
    const { sport_id, status } = req.query;
    let q = `
      SELECT t.*, s.name AS sport_name, s.logo_url AS sport_logo,
        COUNT(DISTINCT tt.team_id) AS team_count
      FROM tournaments t
      JOIN sports s ON s.id = t.sport_id
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      WHERE 1=1
    `;
    const vals = []; let idx = 1;
    if (sport_id) { q += ` AND t.sport_id=$${idx++}`; vals.push(sport_id); }
    if (status)   { q += ` AND t.status=$${idx++}`;   vals.push(status); }
    q += ' GROUP BY t.id, s.name, s.logo_url ORDER BY t.created_at DESC';
    const result = await pool.query(q, vals);
    res.json({ tournaments: result.rows });
  } catch (err) { next(err); }
};

// GET /api/tournaments/:id  — full detail with bracket
const getTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tour = await pool.query(`
      SELECT t.*, s.name AS sport_name
      FROM tournaments t JOIN sports s ON s.id=t.sport_id WHERE t.id=$1`, [id]);
    if (!tour.rows[0]) return res.status(404).json({ error: 'Tournament not found' });

    const teams = await pool.query(`
      SELECT tt.*, te.name AS team_name, te.logo_url AS team_logo, tt.seed, tt.group_name
      FROM tournament_teams tt JOIN teams te ON te.id=tt.team_id
      WHERE tt.tournament_id=$1 ORDER BY tt.seed`, [id]);

    const rounds = await pool.query(
      `SELECT * FROM bracket_rounds WHERE tournament_id=$1 ORDER BY round_number`, [id]);

    const bmatches = await pool.query(`
      SELECT bm.*,
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        wt.name AS winner_name,
        m.score_home, m.score_away, m.status AS match_status,
        m.scheduled_at, m.venue,
        br.round_number, br.round_name
      FROM bracket_matches bm
      JOIN bracket_rounds br ON br.id=bm.round_id
      LEFT JOIN teams th ON th.id=bm.team_home_id
      LEFT JOIN teams ta ON ta.id=bm.team_away_id
      LEFT JOIN teams wt ON wt.id=bm.winner_id
      LEFT JOIN matches m ON m.id=bm.match_id
      WHERE bm.tournament_id=$1
      ORDER BY br.round_number, bm.slot_number`, [id]);

    // Group bracket by round
    const roundMap = {};
    for (const r of rounds.rows) {
      roundMap[r.id] = { ...r, matches: [] };
    }
    for (const bm of bmatches.rows) {
      if (roundMap[bm.round_id]) roundMap[bm.round_id].matches.push(bm);
    }

    res.json({
      tournament: tour.rows[0],
      teams: teams.rows,
      bracket: Object.values(roundMap),
    });
  } catch (err) { next(err); }
};

// POST /api/tournaments  — create tournament
const createTournament = async (req, res, next) => {
  try {
    const { name, sport_id, format, start_date, end_date, venue, description, prize } = req.body;
    if (!name || !sport_id) return res.status(400).json({ error: 'name and sport_id required' });

    const result = await pool.query(`
      INSERT INTO tournaments (name,sport_id,format,start_date,end_date,venue,description,prize,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, sport_id, format||'single_elimination', start_date||null, end_date||null,
       venue||null, description||null, prize||null, req.user.id]
    );
    res.status(201).json({ tournament: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/tournaments/:id
const updateTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status, start_date, end_date, venue, description, prize } = req.body;
    const fields = []; const vals = []; let idx = 1;
    if (name)        { fields.push(`name=$${idx++}`);        vals.push(name); }
    if (status)      { fields.push(`status=$${idx++}`);      vals.push(status); }
    if (start_date)  { fields.push(`start_date=$${idx++}`);  vals.push(start_date); }
    if (end_date)    { fields.push(`end_date=$${idx++}`);    vals.push(end_date); }
    if (venue)       { fields.push(`venue=$${idx++}`);       vals.push(venue); }
    if (description) { fields.push(`description=$${idx++}`); vals.push(description); }
    if (prize)       { fields.push(`prize=$${idx++}`);       vals.push(prize); }
    fields.push('updated_at=NOW()');
    if (vals.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(id);
    const result = await pool.query(
      `UPDATE tournaments SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, vals
    );
    res.json({ tournament: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/tournaments/:id
const deleteTournament = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tournaments WHERE id=$1', [req.params.id]);
    res.json({ message: 'Tournament deleted' });
  } catch (err) { next(err); }
};

// POST /api/tournaments/:id/teams  — add teams to tournament
const addTeams = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { team_ids } = req.body; // array of team IDs
    if (!Array.isArray(team_ids) || team_ids.length === 0)
      return res.status(400).json({ error: 'team_ids array required' });

    for (let i = 0; i < team_ids.length; i++) {
      await pool.query(`
        INSERT INTO tournament_teams (tournament_id,team_id,seed)
        VALUES ($1,$2,$3) ON CONFLICT (tournament_id,team_id) DO NOTHING`,
        [id, team_ids[i], i+1]
      );
    }
    res.json({ message: `${team_ids.length} teams added` });
  } catch (err) { next(err); }
};

// DELETE /api/tournaments/:id/teams/:teamId
const removeTeam = async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM tournament_teams WHERE tournament_id=$1 AND team_id=$2',
      [req.params.id, req.params.teamId]
    );
    res.json({ message: 'Team removed' });
  } catch (err) { next(err); }
};

// POST /api/tournaments/:id/generate-bracket
// Generates single-elimination bracket rounds + match slots
const generateBracket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tour = await pool.query('SELECT * FROM tournaments WHERE id=$1', [id]);
    if (!tour.rows[0]) return res.status(404).json({ error: 'Tournament not found' });

    const teamsRes = await pool.query(
      `SELECT tt.team_id, tt.seed, te.name FROM tournament_teams tt
       JOIN teams te ON te.id=tt.team_id
       WHERE tt.tournament_id=$1 ORDER BY tt.seed`, [id]
    );
    const teams = teamsRes.rows;
    if (teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });

    // Delete existing bracket
    await pool.query('DELETE FROM bracket_rounds WHERE tournament_id=$1', [id]);

    const format = tour.rows[0].format;

    if (format === 'round_robin') {
      await generateRoundRobin(id, teams);
    } else {
      // single_elimination, double_elimination, group_knockout all use SE bracket
      await generateSingleElimination(id, teams);
    }

    // Return the fresh bracket
    const rounds = await pool.query(
      `SELECT * FROM bracket_rounds WHERE tournament_id=$1 ORDER BY round_number`, [id]);
    const bmatches = await pool.query(`
      SELECT bm.*, br.round_number, br.round_name,
        th.name AS home_name, ta.name AS away_name, wt.name AS winner_name
      FROM bracket_matches bm
      JOIN bracket_rounds br ON br.id=bm.round_id
      LEFT JOIN teams th ON th.id=bm.team_home_id
      LEFT JOIN teams ta ON ta.id=bm.team_away_id
      LEFT JOIN teams wt ON wt.id=bm.winner_id
      WHERE bm.tournament_id=$1 ORDER BY br.round_number, bm.slot_number`, [id]);

    const roundMap = {};
    for (const r of rounds.rows) roundMap[r.id] = { ...r, matches: [] };
    for (const bm of bmatches.rows) {
      if (roundMap[bm.round_id]) roundMap[bm.round_id].matches.push(bm);
    }

    res.json({ bracket: Object.values(roundMap) });
  } catch (err) { next(err); }
};

async function generateSingleElimination(tournamentId, teams) {
  // Pad to next power of 2
  let n = 1;
  while (n < teams.length) n *= 2;
  const byes = n - teams.length;

  // Round names
  const roundNames = {
    1: 'Final',
    2: 'Semi-Final',
    4: 'Quarter-Final',
    8: 'Round of 16',
    16: 'Round of 32',
  };

  const totalRounds = Math.log2(n);

  // Create rounds (first round = Round of n, last = Final)
  const roundIds = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = n / Math.pow(2, r + 1);
    const rName = roundNames[matchesInRound] || `Round of ${matchesInRound * 2}`;
    const rRow = await pool.query(
      `INSERT INTO bracket_rounds (tournament_id,round_number,round_name) VALUES ($1,$2,$3) RETURNING id`,
      [tournamentId, r + 1, rName]
    );
    roundIds.push(rRow.rows[0].id);
  }

  // Seed first round with standard tournament seeding (1v8, 4v5, 3v6, 2v7 for 8 teams etc.)
  const firstRoundId = roundIds[0];
  const matchesInFirstRound = n / 2;

  // Standard seeding pairs: [1,n],[2,n-1],[3,n-2]... but bracket style
  const seededPairs = buildSeededPairs(n);

  for (let slot = 0; slot < matchesInFirstRound; slot++) {
    const [s1, s2] = seededPairs[slot];
    const team1 = teams[s1 - 1] || null; // s1 is 1-indexed seed
    const team2 = teams[s2 - 1] || null;

    await pool.query(`
      INSERT INTO bracket_matches (tournament_id,round_id,slot_number,team_home_id,team_away_id)
      VALUES ($1,$2,$3,$4,$5)`,
      [tournamentId, firstRoundId, slot + 1,
       team1 ? team1.team_id : null,
       team2 ? team2.team_id : null]
    );
  }

  // Create empty slots for subsequent rounds
  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = n / Math.pow(2, r + 1);
    for (let slot = 0; slot < matchesInRound; slot++) {
      await pool.query(`
        INSERT INTO bracket_matches (tournament_id,round_id,slot_number,team_home_id,team_away_id)
        VALUES ($1,$2,$3,NULL,NULL)`,
        [tournamentId, roundIds[r], slot + 1]
      );
    }
  }
}

function buildSeededPairs(n) {
  // Recursive bracket seeding: 1v(n), (n/2+1)v(n/2) etc.
  if (n === 2) return [[1, 2]];
  const half = n / 2;
  const pairs = [];
  const prev = buildSeededPairs(half);
  for (const [a, b] of prev) {
    pairs.push([a, n + 1 - a]);
    pairs.push([b, n + 1 - b]);
  }
  // Reorder for standard bracket layout
  const reordered = [];
  for (let i = 0; i < prev.length; i++) {
    reordered.push(pairs[i * 2]);
    reordered.push(pairs[i * 2 + 1]);
  }
  return reordered;
}

async function generateRoundRobin(tournamentId, teams) {
  const n = teams.length;
  const totalRounds = n % 2 === 0 ? n - 1 : n;
  const matchesPerRound = Math.floor(n / 2);

  for (let r = 0; r < totalRounds; r++) {
    const rRow = await pool.query(
      `INSERT INTO bracket_rounds (tournament_id,round_number,round_name) VALUES ($1,$2,$3) RETURNING id`,
      [tournamentId, r + 1, `Round ${r + 1}`]
    );
    const roundId = rRow.rows[0].id;

    // Circle method for round-robin scheduling
    const rotated = [teams[0], ...teams.slice(1).slice(-r).concat(teams.slice(1).slice(0, teams.length - 1 - r))];
    for (let m = 0; m < matchesPerRound; m++) {
      const t1 = rotated[m];
      const t2 = rotated[n - 1 - m];
      await pool.query(`
        INSERT INTO bracket_matches (tournament_id,round_id,slot_number,team_home_id,team_away_id)
        VALUES ($1,$2,$3,$4,$5)`,
        [tournamentId, roundId, m + 1, t1.team_id, t2.team_id]
      );
    }
  }
}

// POST /api/tournaments/:id/bracket/:matchId/result  — set winner & advance
const setBracketResult = async (req, res, next) => {
  try {
    const { id, matchId } = req.params;
    const { winner_id, score_home, score_away, match_id } = req.body;

    // Update bracket match winner
    await pool.query(
      `UPDATE bracket_matches SET winner_id=$1, match_id=$2 WHERE id=$3 AND tournament_id=$4`,
      [winner_id, match_id||null, matchId, id]
    );

    // Advance winner to next round
    const bm = await pool.query(
      `SELECT bm.slot_number, br.round_number,
        (SELECT id FROM bracket_rounds WHERE tournament_id=$1 AND round_number=br.round_number+1 LIMIT 1) AS next_round_id
       FROM bracket_matches bm JOIN bracket_rounds br ON br.id=bm.round_id
       WHERE bm.id=$2`, [id, matchId]
    );

    if (bm.rows[0]?.next_round_id) {
      const { slot_number, next_round_id } = bm.rows[0];
      const nextSlot = Math.ceil(slot_number / 2);
      const isHome = slot_number % 2 === 1;
      const col = isHome ? 'team_home_id' : 'team_away_id';
      await pool.query(
        `UPDATE bracket_matches SET ${col}=$1 WHERE round_id=$2 AND slot_number=$3`,
        [winner_id, next_round_id, nextSlot]
      );
    }

    res.json({ message: 'Result saved, bracket updated' });
  } catch (err) { next(err); }
};

module.exports = {
  getTournaments, getTournament, createTournament, updateTournament, deleteTournament,
  addTeams, removeTeam, generateBracket, setBracketResult
};
