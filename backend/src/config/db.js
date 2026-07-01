const { Pool } = require('pg');

// Neon provides a standard PostgreSQL connection string (pooled).
// Get it from: Neon Console → Your Project → Dashboard → Connection string
// Make sure "Pooled connection" is toggled ON for serverless-friendly usage.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Neon DB pool error:', err.message);
});

module.exports = pool;