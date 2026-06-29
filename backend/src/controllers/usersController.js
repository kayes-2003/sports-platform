const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/users — admin only
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.avatar_url,
        u.assigned_sport_id, s.name AS assigned_sport_name, u.created_at
      FROM users u
      LEFT JOIN sports s ON s.id = u.assigned_sport_id
      WHERE 1=1
    `;
    const values = [];
    if (role) { query += ' AND u.role = $1'; values.push(role); }
    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, values);
    res.json({ users: result.rows });
  } catch (err) { next(err); }
};

// PUT /api/users/:id — admin updates user (e.g. change role or sport assignment)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, assigned_sport_id } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (role) { fields.push(`role = $${idx++}`); values.push(role); }
    if (assigned_sport_id !== undefined) {
      fields.push(`assigned_sport_id = $${idx++}`);
      values.push(assigned_sport_id || null);
    }
    fields.push('updated_at = NOW()');
    if (values.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, assigned_sport_id, avatar_url`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id — admin only
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

module.exports = { getUsers, updateUser, deleteUser };
