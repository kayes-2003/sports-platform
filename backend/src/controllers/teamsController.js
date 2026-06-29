const pool = require('../config/db');

const getAllTeams = async (req, res, next) => {
  try {
    const { sport_id } = req.query;
    let query = `
      SELECT t.*, s.name AS sport_name,
        COUNT(p.id) AS player_count
      FROM teams t
      JOIN sports s ON s.id = t.sport_id
      LEFT JOIN players p ON p.team_id = t.id
    `;
    const values = [];
    if (sport_id) { query += ' WHERE t.sport_id = $1'; values.push(sport_id); }
    query += ' GROUP BY t.id, s.name ORDER BY t.name';

    const result = await pool.query(query, values);
    res.json({ teams: result.rows });
  } catch (err) { next(err); }
};

const getTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await pool.query(`
      SELECT t.*, s.name AS sport_name, s.scoring_unit
      FROM teams t JOIN sports s ON s.id = t.sport_id
      WHERE t.id = $1`, [id]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });

    const players = await pool.query(
      'SELECT * FROM players WHERE team_id = $1 ORDER BY jersey_number, name', [id]
    );

    // H2H history
    const h2h = await pool.query(`
      SELECT m.*, 
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        wt.name AS winner_name, s.name AS sport_name
      FROM matches m
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      JOIN sports s ON s.id = m.sport_id
      LEFT JOIN teams wt ON wt.id = m.winner_team_id
      WHERE (m.team_home_id = $1 OR m.team_away_id = $1)
        AND m.status = 'completed'
      ORDER BY m.scheduled_at DESC
      LIMIT 10`, [id]);

    res.json({ team: team.rows[0], players: players.rows, recent_matches: h2h.rows });
  } catch (err) { next(err); }
};

const createTeam = async (req, res, next) => {
  try {
    const { name, sport_id } = req.body;
    const logo_url = req.file?.path || null;
    if (!name || !sport_id) return res.status(400).json({ error: 'Name and sport_id required' });

    const result = await pool.query(
      'INSERT INTO teams (name, sport_id, logo_url) VALUES ($1, $2, $3) RETURNING *',
      [name, sport_id, logo_url]
    );
    res.status(201).json({ team: result.rows[0] });
  } catch (err) { next(err); }
};

const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const logo_url = req.file?.path;

    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (logo_url) { fields.push(`logo_url = $${idx++}`); values.push(logo_url); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Team not found' });
    res.json({ team: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteTeam = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team deleted' });
  } catch (err) { next(err); }
};

// GET head-to-head between two teams
const getHeadToHead = async (req, res, next) => {
  try {
    const { team1, team2 } = req.params;
    const matches = await pool.query(`
      SELECT m.*,
        th.name AS home_name, th.logo_url AS home_logo,
        ta.name AS away_name, ta.logo_url AS away_logo,
        wt.name AS winner_name, s.name AS sport_name
      FROM matches m
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      JOIN sports s ON s.id = m.sport_id
      LEFT JOIN teams wt ON wt.id = m.winner_team_id
      WHERE (
        (m.team_home_id = $1 AND m.team_away_id = $2) OR
        (m.team_home_id = $2 AND m.team_away_id = $1)
      ) AND m.status = 'completed'
      ORDER BY m.scheduled_at DESC
    `, [team1, team2]);

    const stats = { team1_wins: 0, team2_wins: 0, draws: 0 };
    for (const m of matches.rows) {
      if (!m.winner_team_id) stats.draws++;
      else if (m.winner_team_id === team1) stats.team1_wins++;
      else stats.team2_wins++;
    }

    res.json({ matches: matches.rows, stats });
  } catch (err) { next(err); }
};

module.exports = { getAllTeams, getTeam, createTeam, updateTeam, deleteTeam, getHeadToHead };
