const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
};

// POST /api/auth/signup  ← NEW — public self-registration (visitor role only)
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const emailLower = email.toLowerCase().trim();

    // Check duplicate
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1', [emailLower]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'visitor')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), emailLower, hash]
    );

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user,
      message: 'Account created successfully',
    });
  } catch (err) { next(err); }
};

// POST /api/auth/register  — admin creates helpers/admins
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'visitor', assigned_sport_id } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, password required' });

    if (role === 'helper' && req.user?.role !== 'admin')
      return res.status(403).json({ error: 'Only admin can create helper accounts' });
    if (role === 'admin' && req.user?.role !== 'admin')
      return res.status(403).json({ error: 'Only admin can create admin accounts' });

    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, assigned_sport_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, assigned_sport_id, created_at`,
      [name, email.toLowerCase(), hash, role, assigned_sport_id || null]
    );
    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userRow = await pool.query(
      'SELECT password FROM users WHERE id = $1', [req.user.id]
    );
    const match = await bcrypt.compare(current_password, userRow.rows[0].password);
    if (!match)
      return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user.id]
    );
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};

module.exports = { login, signup, register, getMe, changePassword };