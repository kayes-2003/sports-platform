const pool = require('../config/db');

// GET /api/sports
const getAllSports = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        COUNT(DISTINCT t.id) AS team_count,
        COUNT(DISTINCT p.id) AS player_count
      FROM sports s
      LEFT JOIN teams t ON t.sport_id = s.id
      LEFT JOIN players p ON p.sport_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `);
    res.json({ sports: result.rows });
  } catch (err) { next(err); }
};

// GET /api/sports/:id
const getSport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sport = await pool.query('SELECT * FROM sports WHERE id = $1', [id]);
    if (!sport.rows[0]) return res.status(404).json({ error: 'Sport not found' });

    const teams = await pool.query(
      'SELECT * FROM teams WHERE sport_id = $1 ORDER BY name', [id]
    );
    res.json({ sport: sport.rows[0], teams: teams.rows });
  } catch (err) { next(err); }
};

// POST /api/sports
const createSport = async (req, res, next) => {
  try {
    const { name, description, scoring_unit } = req.body;
    const logo_url = req.file?.path || null;

    const result = await pool.query(
      `INSERT INTO sports (name, description, scoring_unit, logo_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, scoring_unit || 'points', logo_url]
    );
    res.status(201).json({ sport: result.rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/sports/:id
const updateSport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, scoring_unit } = req.body;
    const logo_url = req.file?.path;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (scoring_unit) { fields.push(`scoring_unit = $${idx++}`); values.push(scoring_unit); }
    if (logo_url) { fields.push(`logo_url = $${idx++}`); values.push(logo_url); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE sports SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Sport not found' });
    res.json({ sport: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/sports/:id
const deleteSport = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM sports WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Sport not found' });
    res.json({ message: 'Sport deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllSports, getSport, createSport, updateSport, deleteSport };
