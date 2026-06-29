require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a specific match room for live score updates
  socket.on('join_match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`  → joined match:${matchId}`);
  });

  // Join a sport room to get all matches of a sport
  socket.on('join_sport', (sportId) => {
    socket.join(`sport:${sportId}`);
    console.log(`  → joined sport:${sportId}`);
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/sports',     require('./routes/sports'));
app.use('/api/teams',      require('./routes/teams'));
app.use('/api/players',    require('./routes/players'));
app.use('/api/matches',    require('./routes/matches')(io));
app.use('/api/insights',   require('./routes/insights'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/tournaments',require('./routes/tournaments'));

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err.message);
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry — record already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Sports API running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`\nRun "npm run db:init" to initialize DB & seed data\n`);
});
