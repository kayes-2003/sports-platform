const pool = require('../config/db');
const {
  buildSingleElimination,
  buildDoubleElimination,
  buildRoundRobin,
  buildGroupKnockout,
} = require('../utils/bracketBuilder');

// GET /api/tournaments?sport_id=&status=
const list = async (req, res, next) => {
  try {
    const { sport_id, status } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (sport_id) { conditions.push(`t.sport_id = $${idx++}`); values.push(sport_id); }
    if (status) { conditions.push(`t.status = $${idx++}`); values.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT t.*, s.name AS sport_name, s.logo_url AS sport_logo,
              (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id) AS team_count
       FROM tournaments t
       JOIN sports s ON s.id = t.sport_id
       ${where}
       ORDER BY t.created_at DESC`,
      values
    );

    res.json({ tournaments: result.rows });
  } catch (err) { next(err); }
};

// GET /api/tournaments/:id  -> { tournament, teams, bracket: BracketRound[] }
const get = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tRes = await pool.query(
      `SELECT t.*, s.name AS sport_name, s.logo_url AS sport_logo, s.result_format
       FROM tournaments t JOIN sports s ON s.id = t.sport_id
       WHERE t.id = $1`,
      [id]
    );
    if (tRes.rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    const tournament = tRes.rows[0];

    const teamsRes = await pool.query(
      `SELECT tt.*, te.name AS team_name, te.logo_url AS team_logo
       FROM tournament_teams tt
       JOIN teams te ON te.id = tt.team_id
       WHERE tt.tournament_id = $1
       ORDER BY tt.group_name NULLS LAST, tt.points DESC NULLS LAST, tt.seed ASC NULLS LAST`,
      [id]
    );

    const roundsRes = await pool.query(
      `SELECT * FROM tournament_rounds WHERE tournament_id = $1 ORDER BY bracket_side, round_number ASC`,
      [id]
    );

    const matchesRes = await pool.query(
      `SELECT tm.*,
              th.name AS home_name, th.logo_url AS home_logo,
              ta.name AS away_name, ta.logo_url AS away_logo,
              tw.name AS winner_name
       FROM tournament_matches tm
       LEFT JOIN teams th ON th.id = tm.team_home_id
       LEFT JOIN teams ta ON ta.id = tm.team_away_id
       LEFT JOIN teams tw ON tw.id = tm.winner_id
       WHERE tm.tournament_id = $1
       ORDER BY tm.slot_number ASC`,
      [id]
    );

    // Shape into BracketRound[] matching frontend types.ts exactly
    const bracket = roundsRes.rows.map((round) => ({
      id: round.id,
      round_number: round.round_number,
      round_name: round.round_name,
      bracket_side: round.bracket_side,
      matches: matchesRes.rows
        .filter((m) => m.round_id === round.id)
        .map((m) => ({
          id: m.id,
          tournament_id: m.tournament_id,
          round_id: m.round_id,
          round_number: round.round_number,
          round_name: round.round_name,
          match_id: m.match_id,
          slot_number: m.slot_number,
          group_name: m.group_name,
          team_home_id: m.team_home_id,
          home_name: m.home_name,
          home_logo: m.home_logo,
          team_away_id: m.team_away_id,
          away_name: m.away_name,
          away_logo: m.away_logo,
          winner_id: m.winner_id,
          winner_name: m.winner_name,
          score_home: m.score_home,
          score_away: m.score_away,
          match_status: m.match_status,
          scheduled_at: m.scheduled_at,
          venue: m.venue,
          next_match_slot: m.next_match_slot,
        })),
    }));

    res.json({ tournament, teams: teamsRes.rows, bracket });
  } catch (err) { next(err); }
};

// POST /api/tournaments
// body: { name, sport_id, format, start_date?, end_date?, venue?, description?, prize?,
//         group_count?, teams_advance_per_group? }
// NOTE: teams are added separately via addTeams, bracket generated separately via generateBracket
// (matches frontend flow: create -> addTeams -> generateBracket)
const create = async (req, res, next) => {
  try {
    const {
      name, sport_id, format,
      start_date, end_date, venue, description, prize,
      group_count, teams_advance_per_group,
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Tournament name is required' });
    if (!sport_id) return res.status(400).json({ error: 'Sport is required' });
    if (!['single_elimination', 'double_elimination', 'round_robin', 'group_knockout'].includes(format)) {
      return res.status(400).json({ error: 'Invalid tournament format' });
    }

    const result = await pool.query(
      `INSERT INTO tournaments
         (name, sport_id, format, status, start_date, end_date, venue, description, prize,
          group_count, teams_advance_per_group, created_by)
       VALUES ($1,$2,$3,'upcoming',$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        name.trim(), sport_id, format,
        start_date || null, end_date || null, venue || null, description || null, prize || null,
        group_count || 2, teams_advance_per_group || 2,
        req.user.id,
      ]
    );

    res.status(201).json({ tournament: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/tournaments/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, venue, description, prize, status } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (start_date !== undefined) { fields.push(`start_date = $${idx++}`); values.push(start_date); }
    if (end_date !== undefined) { fields.push(`end_date = $${idx++}`); values.push(end_date); }
    if (venue !== undefined) { fields.push(`venue = $${idx++}`); values.push(venue); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (prize !== undefined) { fields.push(`prize = $${idx++}`); values.push(prize); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE tournaments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Tournament not found' });

    res.json({ tournament: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/tournaments/:id
const remove = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM tournaments WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Tournament not found' });
    res.json({ message: 'Tournament deleted' });
  } catch (err) { next(err); }
};

// POST /api/tournaments/:id/teams   body: { team_ids: [...] }
const addTeams = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { team_ids } = req.body;
    if (!Array.isArray(team_ids) || team_ids.length === 0) {
      return res.status(400).json({ error: 'team_ids must be a non-empty array' });
    }

    const existing = await pool.query(
      'SELECT COUNT(*) FROM tournament_teams WHERE tournament_id = $1',
      [id]
    );
    let nextSeed = parseInt(existing.rows[0].count, 10) + 1;

    for (const teamId of team_ids) {
      await pool.query(
        `INSERT INTO tournament_teams (tournament_id, team_id, seed)
         VALUES ($1, $2, $3)
         ON CONFLICT (tournament_id, team_id) DO NOTHING`,
        [id, teamId, nextSeed++]
      );
    }

    res.json({ message: 'Teams added' });
  } catch (err) { next(err); }
};

// DELETE /api/tournaments/:id/teams/:teamId
const removeTeam = async (req, res, next) => {
  try {
    const { id, teamId } = req.params;
    await pool.query(
      'DELETE FROM tournament_teams WHERE tournament_id = $1 AND team_id = $2',
      [id, teamId]
    );
    res.json({ message: 'Team removed' });
  } catch (err) { next(err); }
};

// POST /api/tournaments/:id/generate-bracket
// Builds the bracket/rounds/matches based on tournament.format and currently
// entered tournament_teams. Idempotent guard: refuses if a bracket already exists
// (delete + recreate the tournament, or extend this later with a force flag, if regeneration is needed).
const generateBracket = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const tRes = await client.query('SELECT * FROM tournaments WHERE id = $1', [id]);
    if (tRes.rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    const tournament = tRes.rows[0];

    const existingRounds = await client.query(
      'SELECT COUNT(*) FROM tournament_rounds WHERE tournament_id = $1',
      [id]
    );
    if (parseInt(existingRounds.rows[0].count, 10) > 0) {
      return res.status(409).json({ error: 'Bracket already generated for this tournament' });
    }

    const teamsRes = await client.query(
      'SELECT team_id FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed ASC NULLS LAST',
      [id]
    );
    const teamIds = teamsRes.rows.map((r) => r.team_id);

    if (teamIds.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to generate a bracket' });
    }

    let structure;
    if (tournament.format === 'single_elimination') {
      structure = buildSingleElimination(teamIds);
    } else if (tournament.format === 'double_elimination') {
      if (teamIds.length < 3) {
        return res.status(400).json({ error: 'Double elimination needs at least 3 teams' });
      }
      structure = buildDoubleElimination(teamIds);
    } else if (tournament.format === 'round_robin') {
      structure = buildRoundRobin(teamIds);
    } else if (tournament.format === 'group_knockout') {
      if (teamIds.length < tournament.group_count * 2) {
        return res.status(400).json({ error: `Need at least ${tournament.group_count * 2} teams for ${tournament.group_count} groups` });
      }
      structure = buildGroupKnockout(teamIds, tournament.group_count, tournament.teams_advance_per_group);

      // Persist group assignments onto tournament_teams
      await client.query('BEGIN');
      for (const g of structure.groups) {
        for (const teamId of g.team_ids) {
          await client.query(
            'UPDATE tournament_teams SET group_name = $1 WHERE tournament_id = $2 AND team_id = $3',
            [g.name, id, teamId]
          );
        }
      }
      await client.query('COMMIT');
    } else {
      return res.status(400).json({ error: 'Unsupported format' });
    }

    await client.query('BEGIN');

    const tempRoundIdToReal = {};
    const tempNodeIdToReal = {};

    // Pass 1: insert rounds
    for (const round of structure.rounds) {
      const r = await client.query(
        `INSERT INTO tournament_rounds (tournament_id, round_number, round_name, bracket_side)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [id, round.round_number, round.round_name, round.bracket_side]
      );
      tempRoundIdToReal[round.tempId] = r.rows[0].id;
    }

    // Pass 2: insert matches (without cross-references yet)
    for (const round of structure.rounds) {
      const realRoundId = tempRoundIdToReal[round.tempId];
      for (const node of round.nodes) {
        const ins = await client.query(
          `INSERT INTO tournament_matches
             (tournament_id, round_id, slot_number, group_name,
              team_home_id, team_away_id, winner_id, match_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id`,
          [
            id, realRoundId, node.slot_number, node.group_name || null,
            node.team_home_id, node.team_away_id, node.winner_id || null, node.match_status,
          ]
        );
        tempNodeIdToReal[node.tempId] = ins.rows[0].id;
      }
    }

    // Pass 3: resolve next_match_id / loser_next_match_id now that all real ids exist
    for (const round of structure.rounds) {
      for (const node of round.nodes) {
        const realThisId = tempNodeIdToReal[node.tempId];
        const updates = [];
        const values = [];
        let idx = 1;

        if (node.next_match_id) {
          updates.push(`next_match_id = $${idx++}`); values.push(tempNodeIdToReal[node.next_match_id] || null);
          updates.push(`next_match_slot = $${idx++}`); values.push(node.next_match_slot ?? null);
        }
        if (node.loser_next_match_id) {
          updates.push(`loser_next_match_id = $${idx++}`); values.push(tempNodeIdToReal[node.loser_next_match_id] || null);
          updates.push(`loser_next_match_slot = $${idx++}`); values.push(node.loser_next_match_slot ?? null);
        }

        if (updates.length > 0) {
          values.push(realThisId);
          await client.query(
            `UPDATE tournament_matches SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
          );
        }
      }
    }

    await client.query(
      `UPDATE tournaments SET status = 'ongoing', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    // Return freshly built bracket in the same shape as GET /:id
    req.params.id = id;
    return get(req, res, next);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/tournaments/:id/bracket/:matchId/result
// body: { winner_id, score_home?, score_away? }
// Records result for a single bracket match node, advances winner (and, for
// double elimination, drops loser into the losers bracket), updates standings
// for round_robin / group stage of group_knockout.
const setResult = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: tournamentId, matchId } = req.params;
    const { winner_id, score_home, score_away } = req.body;

    if (!winner_id) return res.status(400).json({ error: 'winner_id is required' });

    await client.query('BEGIN');

    const nodeRes = await client.query(
      'SELECT * FROM tournament_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, tournamentId]
    );
    if (nodeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bracket match not found' });
    }
    const node = nodeRes.rows[0];

    if (winner_id !== node.team_home_id && winner_id !== node.team_away_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'winner_id must be one of the two teams in this match' });
    }
    const loserId = winner_id === node.team_home_id ? node.team_away_id : node.team_home_id;

    await client.query(
      `UPDATE tournament_matches
       SET winner_id = $1, score_home = $2, score_away = $3, match_status = 'completed', updated_at = NOW()
       WHERE id = $4`,
      [winner_id, score_home ?? null, score_away ?? null, matchId]
    );

    const tRes = await client.query('SELECT format FROM tournaments WHERE id = $1', [tournamentId]);
    const format = tRes.rows[0]?.format;

    // Advance winner forward
    if (node.next_match_id) {
      const col = node.next_match_slot === 0 ? 'team_home_id' : 'team_away_id';
      await client.query(
        `UPDATE tournament_matches SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
        [winner_id, node.next_match_id]
      );
      await client.query(
        `UPDATE tournament_matches SET match_status = 'ready'
         WHERE id = $1 AND team_home_id IS NOT NULL AND team_away_id IS NOT NULL AND match_status = 'pending'`,
        [node.next_match_id]
      );
    }

    // Double elimination: drop loser into losers bracket
    if (format === 'double_elimination' && node.loser_next_match_id) {
      const col = node.loser_next_match_slot === 0 ? 'team_home_id' : 'team_away_id';
      await client.query(
        `UPDATE tournament_matches SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
        [loserId, node.loser_next_match_id]
      );
      await client.query(
        `UPDATE tournament_matches SET match_status = 'ready'
         WHERE id = $1 AND team_home_id IS NOT NULL AND team_away_id IS NOT NULL AND match_status = 'pending'`,
        [node.loser_next_match_id]
      );
    }

    // Round robin / group stage standings
    if (format === 'round_robin' || node.group_name) {
      const isDraw = score_home !== undefined && score_away !== undefined && score_home === score_away;
      if (isDraw) {
        await client.query(
          `UPDATE tournament_teams SET played = played+1, draws = draws+1, points = points+1
           WHERE tournament_id = $1 AND team_id IN ($2,$3)`,
          [tournamentId, node.team_home_id, node.team_away_id]
        );
      } else {
        await client.query(
          `UPDATE tournament_teams SET played = played+1, wins = wins+1, points = points+3
           WHERE tournament_id = $1 AND team_id = $2`,
          [tournamentId, winner_id]
        );
        await client.query(
          `UPDATE tournament_teams SET played = played+1, losses = losses+1
           WHERE tournament_id = $1 AND team_id = $2`,
          [tournamentId, loserId]
        );
      }
      if (score_home !== undefined && score_away !== undefined) {
        const homeDiff = node.team_home_id === winner_id ? (score_home - score_away) : (score_away - score_home);
        await client.query(
          `UPDATE tournament_teams SET goal_diff = goal_diff + $1 WHERE tournament_id = $2 AND team_id = $3`,
          [score_home - score_away, tournamentId, node.team_home_id]
        );
        await client.query(
          `UPDATE tournament_teams SET goal_diff = goal_diff + $1 WHERE tournament_id = $2 AND team_id = $3`,
          [score_away - score_home, tournamentId, node.team_away_id]
        );
      }
    }

    // Check overall completion
    const remaining = await client.query(
      `SELECT COUNT(*) FROM tournament_matches
       WHERE tournament_id = $1 AND match_status NOT IN ('completed','bye')`,
      [tournamentId]
    );
    if (parseInt(remaining.rows[0].count, 10) === 0) {
      await client.query(`UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [tournamentId]);
    }

    await client.query('COMMIT');

    if (req.io) {
      req.io.to(`sport:${(await pool.query('SELECT sport_id FROM tournaments WHERE id=$1', [tournamentId])).rows[0]?.sport_id}`)
        .emit('tournament_update', { tournament_id: tournamentId, match_id: matchId, winner_id });
    }

    res.json({ message: 'Result recorded' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { list, get, create, update, remove, addTeams, removeTeam, generateBracket, setResult };
