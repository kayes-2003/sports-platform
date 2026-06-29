const pool = require('../config/db');

// GET /api/matches?status=live|upcoming|completed&sport_id=&date=
const getMatches = async (req, res, next) => {
  try {
    const { status, sport_id, date, team_id } = req.query;
    let query = `
      SELECT m.*,
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        wt.name AS winner_name,
        s.name AS sport_name, s.scoring_unit, s.logo_url AS sport_logo
      FROM matches m
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      JOIN sports s ON s.id = m.sport_id
      LEFT JOIN teams wt ON wt.id = m.winner_team_id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;

    if (status) { query += ` AND m.status = $${idx++}`; values.push(status); }
    if (sport_id) { query += ` AND m.sport_id = $${idx++}`; values.push(sport_id); }
    if (team_id) {
      query += ` AND (m.team_home_id = $${idx} OR m.team_away_id = $${idx})`;
      values.push(team_id); idx++;
    }
    if (date) {
      query += ` AND DATE(m.scheduled_at) = $${idx++}`;
      values.push(date);
    }

    // Default grouping: today first, then upcoming, then past
    query += ` ORDER BY
      CASE m.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
      m.scheduled_at DESC`;

    const result = await pool.query(query, values);
    res.json({ matches: result.rows });
  } catch (err) { next(err); }
};

// GET /api/matches/today
const getTodayMatches = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        s.name AS sport_name, s.scoring_unit, s.logo_url AS sport_logo
      FROM matches m
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      JOIN sports s ON s.id = m.sport_id
      WHERE DATE(m.scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE
      ORDER BY m.scheduled_at
    `);
    res.json({ matches: result.rows });
  } catch (err) { next(err); }
};

// GET /api/matches/:id
const getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const match = await pool.query(`
      SELECT m.*,
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        wt.name AS winner_name,
        s.name AS sport_name, s.scoring_unit
      FROM matches m
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      JOIN sports s ON s.id = m.sport_id
      LEFT JOIN teams wt ON wt.id = m.winner_team_id
      WHERE m.id = $1
    `, [id]);

    if (!match.rows[0]) return res.status(404).json({ error: 'Match not found' });

    const events = await pool.query(`
      SELECT se.*, p.name AS player_name, p.photo_url AS player_photo,
        t.name AS team_name
      FROM score_events se
      LEFT JOIN players p ON p.id = se.player_id
      JOIN teams t ON t.id = se.team_id
      WHERE se.match_id = $1
      ORDER BY se.created_at ASC
    `, [id]);

    res.json({ match: match.rows[0], events: events.rows });
  } catch (err) { next(err); }
};

// POST /api/matches
const createMatch = async (req, res, next) => {
  try {
    const { sport_id, team_home_id, team_away_id, venue, scheduled_at, notes } = req.body;
    if (!sport_id || !team_home_id || !team_away_id || !scheduled_at) {
      return res.status(400).json({ error: 'sport_id, team_home_id, team_away_id, scheduled_at required' });
    }
    if (team_home_id === team_away_id) {
      return res.status(400).json({ error: 'Home and away teams must be different' });
    }

    const result = await pool.query(
      `INSERT INTO matches (sport_id, team_home_id, team_away_id, venue, scheduled_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [sport_id, team_home_id, team_away_id, venue, scheduled_at, notes, req.user.id]
    );
    res.status(201).json({ match: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/matches/:id
const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { venue, scheduled_at, status, notes } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (venue !== undefined) { fields.push(`venue = $${idx++}`); values.push(venue); }
    if (scheduled_at) { fields.push(`scheduled_at = $${idx++}`); values.push(scheduled_at); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes); }
    fields.push(`updated_at = NOW()`);
    if (values.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE matches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Match not found' });

    // Emit via socket if status changed to live/completed
    if (req.io && (status === 'live' || status === 'completed')) {
      req.io.to(`match:${id}`).emit('match_status', { match_id: id, status });
    }

    res.json({ match: result.rows[0] });
  } catch (err) { next(err); }
};

// POST /api/matches/:id/score — live score update (admin/helper)
const updateScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      score_home, score_away,
      player_id, team_id, event_type, description, minute,
      winner_team_id, mark_completed
    } = req.body;

    // Update match score
    const matchResult = await pool.query(
      `UPDATE matches
       SET score_home = $1, score_away = $2,
           status = CASE WHEN $3 THEN 'completed'::varchar ELSE status END,
           winner_team_id = COALESCE($4, winner_team_id),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [score_home, score_away, mark_completed || false, winner_team_id || null, id]
    );

    if (!matchResult.rows[0]) return res.status(404).json({ error: 'Match not found' });
    const match = matchResult.rows[0];

    // Log the event
    let event = null;
    if (event_type && team_id) {
      const evResult = await pool.query(
        `INSERT INTO score_events
           (match_id, player_id, team_id, event_type, description, minute,
            score_home_at_event, score_away_at_event, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, player_id||null, team_id, event_type, description, minute||null,
         score_home, score_away, req.user.id]
      );
      event = evResult.rows[0];
    }

    // Broadcast via WebSocket to all watching this match
    if (req.io) {
      req.io.to(`match:${id}`).emit('score_update', {
        match_id: id,
        score_home: match.score_home,
        score_away: match.score_away,
        status: match.status,
        event,
        updated_at: match.updated_at,
      });

      // Also broadcast to sport room
      req.io.to(`sport:${match.sport_id}`).emit('score_update', {
        match_id: id,
        score_home: match.score_home,
        score_away: match.score_away,
        status: match.status,
      });
    }

    res.json({ match, event });
  } catch (err) { next(err); }
};

// DELETE /api/matches/:id
const deleteMatch = async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM matches WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Match deleted' });
  } catch (err) { next(err); }
};

module.exports = {
  getMatches, getTodayMatches, getMatch,
  createMatch, updateMatch, updateScore, deleteMatch
};
