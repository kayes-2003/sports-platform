const pool = require('../config/db');

// GET /api/insights/overview
const getOverview = async (req, res, next) => {
  try {
    const [sports, matches, players, live] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM sports'),
      pool.query('SELECT COUNT(*) FROM matches'),
      pool.query('SELECT COUNT(*) FROM players'),
      pool.query("SELECT COUNT(*) FROM matches WHERE status = 'live'"),
    ]);

    res.json({
      total_sports: parseInt(sports.rows[0].count),
      total_matches: parseInt(matches.rows[0].count),
      total_players: parseInt(players.rows[0].count),
      live_matches: parseInt(live.rows[0].count),
    });
  } catch (err) { next(err); }
};

// GET /api/insights/sport/:sport_id
const getSportInsights = async (req, res, next) => {
  try {
    const { sport_id } = req.params;

    // Win/loss per team
    const teamStats = await pool.query(`
      SELECT t.id, t.name, t.logo_url,
        COUNT(m.id) AS matches_played,
        COUNT(CASE WHEN m.winner_team_id = t.id THEN 1 END) AS wins,
        COUNT(CASE WHEN m.winner_team_id IS NOT NULL AND m.winner_team_id != t.id THEN 1 END) AS losses,
        COUNT(CASE WHEN m.winner_team_id IS NULL AND m.status = 'completed' THEN 1 END) AS draws
      FROM teams t
      LEFT JOIN matches m ON (m.team_home_id = t.id OR m.team_away_id = t.id)
        AND m.status = 'completed'
      WHERE t.sport_id = $1
      GROUP BY t.id
      ORDER BY wins DESC
    `, [sport_id]);

    // Top scorers
    const topScorers = await pool.query(`
      SELECT p.id, p.name, p.photo_url, t.name AS team_name,
        SUM(ps.goals_or_points) AS total_points
      FROM players p
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN player_stats ps ON ps.player_id = p.id
      WHERE p.sport_id = $1
      GROUP BY p.id, t.name
      HAVING SUM(ps.goals_or_points) > 0
      ORDER BY total_points DESC
      LIMIT 10
    `, [sport_id]);

    // Match results by month (last 6 months)
    const monthlyMatches = await pool.query(`
      SELECT
        TO_CHAR(scheduled_at, 'YYYY-MM') AS month,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
      FROM matches
      WHERE sport_id = $1
        AND scheduled_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month
    `, [sport_id]);

    res.json({
      team_standings: teamStats.rows,
      top_scorers: topScorers.rows,
      monthly_activity: monthlyMatches.rows,
    });
  } catch (err) { next(err); }
};

// GET /api/insights/leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const { sport_id, season } = req.query;
    let query = `
      SELECT p.id, p.name, p.photo_url, t.name AS team_name, s.name AS sport_name,
        SUM(ps.goals_or_points) AS total_points,
        SUM(ps.assists) AS total_assists,
        SUM(ps.matches_played) AS matches_played,
        SUM(ps.wins) AS wins
      FROM player_stats ps
      JOIN players p ON p.id = ps.player_id
      JOIN teams t ON t.id = p.team_id
      JOIN sports s ON s.id = p.sport_id
      WHERE 1=1
    `;
    const values = [];
    let idx = 1;
    if (sport_id) { query += ` AND p.sport_id = $${idx++}`; values.push(sport_id); }
    if (season) { query += ` AND ps.season = $${idx++}`; values.push(season); }
    query += ` GROUP BY p.id, t.name, s.name
               HAVING SUM(ps.goals_or_points) > 0
               ORDER BY total_points DESC LIMIT 20`;

    const result = await pool.query(query, values);
    res.json({ leaderboard: result.rows });
  } catch (err) { next(err); }
};

module.exports = { getOverview, getSportInsights, getLeaderboard };
