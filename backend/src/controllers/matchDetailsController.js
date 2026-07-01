const pool = require('../config/db');
const { buildResultSummary } = require('../utils/resultFormatter');

// PATCH /api/matches/:id/result
// body: {
//   score_home, score_away,
//   man_of_the_match_id, best_scorer_id, best_scorer_value,
//   extra_result_data  (sport-specific, e.g. { winner_wickets_remaining: 6 } for cricket,
//                       { home_sets: 3, away_sets: 1 } for volleyball)
// }
// Marks the match completed, computes result_summary using the sport's result_format,
// and — if this match belongs to a tournament bracket node — advances the winner.
const updateResult = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      score_home,
      score_away,
      man_of_the_match_id,
      best_scorer_id,
      best_scorer_value,
      extra_result_data,
    } = req.body;

    if (score_home === undefined || score_away === undefined) {
      return res.status(400).json({ error: 'score_home and score_away are required' });
    }

    await client.query('BEGIN');

    const matchRes = await client.query(
      `SELECT m.*, s.result_format, s.name AS sport_name,
              th.name AS home_team_name, ta.name AS away_team_name
       FROM matches m
       JOIN sports s ON s.id = m.sport_id
       JOIN teams th ON th.id = m.team_home_id
       JOIN teams ta ON ta.id = m.team_away_id
       WHERE m.id = $1`,
      [id]
    );
    if (matchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found' });
    }
    const match = matchRes.rows[0];

    const winnerTeamId =
      score_home === score_away
        ? null
        : score_home > score_away
        ? match.team_home_id
        : match.team_away_id;

    const resultSummary = buildResultSummary({
      resultFormat: match.result_format,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
      scoreHome: score_home,
      scoreAway: score_away,
      extraResultData: extra_result_data || {},
    });

    const updateRes = await client.query(
      `UPDATE matches SET
         score_home = $1,
         score_away = $2,
         winner_team_id = $3,
         status = 'completed',
         result_summary = $4,
         man_of_the_match_id = $5,
         best_scorer_id = $6,
         best_scorer_value = $7,
         extra_result_data = $8,
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        score_home,
        score_away,
        winnerTeamId,
        resultSummary,
        man_of_the_match_id || null,
        best_scorer_id || null,
        best_scorer_value ?? null,
        JSON.stringify(extra_result_data || {}),
        id,
      ]
    );

    // If linked to a tournament bracket node, advance the winner automatically
    if (match.tournament_match_id && winnerTeamId) {
      const nodeRes = await client.query(
        `SELECT * FROM tournament_matches WHERE id = $1`,
        [match.tournament_match_id]
      );
      if (nodeRes.rows.length > 0) {
        const node = nodeRes.rows[0];
        await client.query(
          `UPDATE tournament_matches SET winner_team_id = $1, status = 'completed', updated_at = NOW() WHERE id = $2`,
          [winnerTeamId, node.id]
        );

        const tRes = await client.query(`SELECT format FROM tournaments WHERE id = $1`, [node.tournament_id]);
        const format = tRes.rows[0]?.format;

        if (format === 'single_elimination' && node.next_match_id) {
          const col = node.next_match_slot === 'home' ? 'team_home_id' : 'team_away_id';
          await client.query(
            `UPDATE tournament_matches SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
            [winnerTeamId, node.next_match_id]
          );
          await client.query(
            `UPDATE tournament_matches SET status = 'ready'
             WHERE id = $1 AND team_home_id IS NOT NULL AND team_away_id IS NOT NULL AND status = 'pending'`,
            [node.next_match_id]
          );
        }

        if (format === 'round_robin') {
          const loserId = winnerTeamId === node.team_home_id ? node.team_away_id : node.team_home_id;
          await client.query(
            `UPDATE tournament_teams SET played = played+1, wins = wins+1, points = points+3
             WHERE tournament_id = $1 AND team_id = $2`,
            [node.tournament_id, winnerTeamId]
          );
          await client.query(
            `UPDATE tournament_teams SET played = played+1, losses = losses+1
             WHERE tournament_id = $1 AND team_id = $2`,
            [node.tournament_id, loserId]
          );
        }
      }
    }

    await client.query('COMMIT');

    const updatedMatch = updateRes.rows[0];

    // Broadcast via WebSocket, matching the convention used by updateScore in matchesController
    if (req.io) {
      req.io.to(`match:${id}`).emit('result_update', {
        match_id: id,
        score_home: updatedMatch.score_home,
        score_away: updatedMatch.score_away,
        status: updatedMatch.status,
        result_summary: updatedMatch.result_summary,
        winner_team_id: updatedMatch.winner_team_id,
        updated_at: updatedMatch.updated_at,
      });
      req.io.to(`sport:${match.sport_id}`).emit('result_update', {
        match_id: id,
        score_home: updatedMatch.score_home,
        score_away: updatedMatch.score_away,
        status: updatedMatch.status,
        result_summary: updatedMatch.result_summary,
      });
    }

    res.json({ match: updatedMatch, result_summary: resultSummary });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/matches/:id/details
// Full match detail: scorers (from score_events), MOTM, best scorer, result summary
const getDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const matchRes = await pool.query(
      `SELECT m.*, s.name AS sport_name, s.result_format,
              th.name AS home_team_name, ta.name AS away_team_name,
              mom.name AS man_of_the_match_name,
              bs.name AS best_scorer_name
       FROM matches m
       JOIN sports s ON s.id = m.sport_id
       JOIN teams th ON th.id = m.team_home_id
       JOIN teams ta ON ta.id = m.team_away_id
       LEFT JOIN players mom ON mom.id = m.man_of_the_match_id
       LEFT JOIN players bs ON bs.id = m.best_scorer_id
       WHERE m.id = $1`,
      [id]
    );
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    const eventsRes = await pool.query(
      `SELECT se.*, p.name AS player_name, t.name AS team_name
       FROM score_events se
       LEFT JOIN players p ON p.id = se.player_id
       LEFT JOIN teams t ON t.id = se.team_id
       WHERE se.match_id = $1
       ORDER BY se.minute ASC NULLS LAST, se.created_at ASC`,
      [id]
    );

    // Top scorer per match derived from score_events (goal/point tally by player)
    const scorerTally = {};
    for (const ev of eventsRes.rows) {
      if (!ev.player_id) continue;
      scorerTally[ev.player_id] = scorerTally[ev.player_id] || { player_name: ev.player_name, count: 0 };
      scorerTally[ev.player_id].count += 1;
    }
    const topScorers = Object.values(scorerTally).sort((a, b) => b.count - a.count);

    res.json({
      match: matchRes.rows[0],
      events: eventsRes.rows,
      top_scorers: topScorers,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateResult, getDetails };
