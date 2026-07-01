const pool = require('./db');
const bcrypt = require('bcryptjs');

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing Neon database...');

    await client.query('BEGIN');

    // ── Users ─────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(150) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(20) NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin','helper','viewer')),
        sport_id    INTEGER,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Sports ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sports (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon        VARCHAR(10),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Teams ─────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        sport_id    INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        logo_url    TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Players ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        sport_id    INTEGER REFERENCES sports(id) ON DELETE SET NULL,
        position    VARCHAR(50),
        jersey_no   INTEGER,
        photo_url   TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Matches ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id            SERIAL PRIMARY KEY,
        sport_id      INTEGER REFERENCES sports(id) ON DELETE CASCADE,
        home_team_id  INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        away_team_id  INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        home_score    INTEGER DEFAULT 0,
        away_score    INTEGER DEFAULT 0,
        status        VARCHAR(20) DEFAULT 'upcoming'
                      CHECK (status IN ('upcoming','live','completed')),
        scheduled_at  TIMESTAMPTZ NOT NULL,
        venue         VARCHAR(150),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Match Events ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS match_events (
        id          SERIAL PRIMARY KEY,
        match_id    INTEGER REFERENCES matches(id) ON DELETE CASCADE,
        player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
        event_type  VARCHAR(50) NOT NULL,
        minute      INTEGER,
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Tables created / verified.');

    // ── Seed Sports ───────────────────────────────────────────────────────────
    const sports = [
      { name: 'Football',   description: 'Association football / Soccer', icon: '⚽' },
      { name: 'Cricket',    description: 'Cricket matches',               icon: '🏏' },
      { name: 'Basketball', description: 'Basketball games',              icon: '🏀' },
      { name: 'Volleyball', description: 'Volleyball matches',            icon: '🏐' },
      { name: 'Badminton',  description: 'Badminton tournaments',         icon: '🏸' },
      { name: 'Table Tennis',description: 'Table tennis events',          icon: '🏓' },
    ];

    for (const s of sports) {
      await pool.query(
        `INSERT INTO sports (name, description, icon)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [s.name, s.description, s.icon]
      );
    }
    console.log('✅ Sports seeded.');

    // ── Seed Admin User ───────────────────────────────────────────────────────
    const adminEmail = 'admin@sports.edu';
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'admin')`,
        ['Admin', adminEmail, hash]
      );
      console.log('✅ Admin user created → admin@sports.edu / admin123');
    } else {
      console.log('ℹ️  Admin user already exists, skipping.');
    }

    console.log('🎉 Neon DB initialization complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ DB init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = initDB;