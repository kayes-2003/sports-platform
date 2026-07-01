require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow both :3000 and :3001 (Next.js sometimes uses either)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join_match', (matchId) => {
    socket.join(`match:${matchId}`);
  });

  socket.on('join_sport', (sportId) => {
    socket.join(`sport:${sportId}`);
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/sports',       require('./routes/sports'));
app.use('/api/teams',        require('./routes/teams'));
app.use('/api/players',      require('./routes/players'));
app.use('/api/matches',      require('./routes/matches')(io));
app.use('/api/insights',     require('./routes/insights'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/tournaments',  require('./routes/tournaments')(io));

app.use((err, req, res, _next) => {
  console.error('❌ Error:', err.message);
  if (err.code === '23505') return res.status(409).json({ error: 'Duplicate entry — record already exists' });
  if (err.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist' });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Sports API running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}\n`);
});
