const pool = require('../config/db');

const getPlayers = async (req, res, next) => {
  try {
    const { team_id, sport_id, search } = req.query;
    let query = `
      SELECT p.*, t.name AS team_name, t.logo_url AS team_logo,
        s.name AS sport_name
      FROM players p
      JOIN teams t ON t.id = p.team_id
      JOIN sports s ON s.id = p.sport_id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;
    if (team_id) { query += ` AND p.team_id = $${idx++}`; values.push(team_id); }
    if (sport_id) { query += ` AND p.sport_id = $${idx++}`; values.push(sport_id); }
    if (search) { query += ` AND p.name ILIKE $${idx++}`; values.push(`%${search}%`); }
    query += ' ORDER BY p.name';

    const result = await pool.query(query, values);
    res.json({ players: result.rows });
  } catch (err) { next(err); }
};

const getPlayer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await pool.query(`
      SELECT p.*, t.name AS team_name, t.logo_url AS team_logo,
        s.name AS sport_name
      FROM players p
      JOIN teams t ON t.id = p.team_id
      JOIN sports s ON s.id = p.sport_id
      WHERE p.id = $1
    `, [id]);
    if (!player.rows[0]) return res.status(404).json({ error: 'Player not found' });

    // Stats per season
    const stats = await pool.query(
      'SELECT * FROM player_stats WHERE player_id = $1 ORDER BY season DESC', [id]
    );

    // Recent match events
    const events = await pool.query(`
      SELECT se.*, m.scheduled_at,
        th.name AS home_team, ta.name AS away_team,
        m.score_home, m.score_away
      FROM score_events se
      JOIN matches m ON m.id = se.match_id
      JOIN teams th ON th.id = m.team_home_id
      JOIN teams ta ON ta.id = m.team_away_id
      WHERE se.player_id = $1
      ORDER BY m.scheduled_at DESC LIMIT 10
    `, [id]);

    res.json({ player: player.rows[0], stats: stats.rows, recent_events: events.rows });
  } catch (err) { next(err); }
};

const createPlayer = async (req, res, next) => {
  try {
    const { name, team_id, sport_id, position, jersey_number, age, bio } = req.body;
    const photo_url = req.file?.path || null;

    if (!name || !team_id || !sport_id) {
      return res.status(400).json({ error: 'name, team_id, sport_id required' });
    }

    const result = await pool.query(
      `INSERT INTO players (name, team_id, sport_id, position, jersey_number, age, bio, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, team_id, sport_id, position, jersey_number || null, age || null, bio, photo_url]
    );
    res.status(201).json({ player: result.rows[0] });
  } catch (err) { next(err); }
};

const updatePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, team_id, position, jersey_number, age, bio } = req.body;
    const photo_url = req.file?.path;

    const fields = [];
    const values = [];
    let idx = 1;
    const add = (col, val) => { fields.push(`${col} = $${idx++}`); values.push(val); };

    if (name) add('name', name);
    if (team_id) add('team_id', team_id);
    if (position !== undefined) add('position', position);
    if (jersey_number !== undefined) add('jersey_number', jersey_number);
    if (age !== undefined) add('age', age);
    if (bio !== undefined) add('bio', bio);
    if (photo_url) add('photo_url', photo_url);
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    add('updated_at', 'NOW()');
    values.push(id);
    const result = await pool.query(
      `UPDATE players SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Player not found' });
    res.json({ player: result.rows[0] });
  } catch (err) { next(err); }
};

const deletePlayer = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player deleted' });
  } catch (err) { next(err); }
};

// PUT /api/players/:id/stats
const updatePlayerStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { season, matches_played, goals_or_points, assists, wins, losses, extra_stats } = req.body;
    const yr = season || new Date().getFullYear().toString();

    const result = await pool.query(`
      INSERT INTO player_stats (player_id, season, matches_played, goals_or_points, assists, wins, losses, extra_stats)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (player_id, season)
      DO UPDATE SET
        matches_played = EXCLUDED.matches_played,
        goals_or_points = EXCLUDED.goals_or_points,
        assists = EXCLUDED.assists,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        extra_stats = EXCLUDED.extra_stats,
        updated_at = NOW()
      RETURNING *
    `, [id, yr, matches_played||0, goals_or_points||0, assists||0, wins||0, losses||0, extra_stats||{}]);

    res.json({ stats: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getPlayers, getPlayer, createPlayer, updatePlayer, deletePlayer, updatePlayerStats };
