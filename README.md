# University Central Sports Platform

A full-stack live sports update platform built with **Next.js + Node.js + Neon (PostgreSQL) + Socket.io**.

---

## ⚡ Quick Start

### Step 0 — Create your Neon project

1. Go to [neon.tech](https://neon.tech) → **Sign up free** → **Create a project**
2. Choose a name and region
3. On the project dashboard, find **Connection string**
4. Toggle **"Pooled connection"** ON (important for serverless/Express apps)
5. Copy the URI — you'll need it below

---

### 1. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` and fill in your values:

```env
DATABASE_URL=postgresql://neondb_owner:[YOUR-PASSWORD]@[YOUR-PROJECT].neon.tech/neondb?sslmode=require
JWT_SECRET=any_long_random_string
PORT=4000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
```

Initialize database (creates all tables + seeds 6 sports + admin user):

```bash
npm run db:init  ###connecting with database
```

Start the server:

```bash
npm run dev       # runs on http://localhost:4000
```

---

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev       # runs on http://localhost:3000
```

---

### 3. Default login

| Role  | Email             | Password  |
|-------|-------------------|-----------|
| Admin | admin@sports.edu  | admin123  |

---

## 🔧 Prerequisites

- Node.js v18+
- A free [Neon](https://neon.tech) account (serverless PostgreSQL)
- A free [Cloudinary](https://cloudinary.com) account (image uploads)

---

## 🆓 Other free PostgreSQL-compatible options (if Neon doesn't fit)

| Provider | Free tier notes |
|---|---|
| **Neon** (used here) | Generous free tier, instant branching, true serverless Postgres, auto-sleeps when idle |
| **Supabase** | Free Postgres + built-in auth/storage if you want an all-in-one BaaS later |
| **Railway** | Free trial credits, simple Postgres + easy backend hosting in one place |
| **Render** | Free Postgres tier (expires after 90 days, then needs a paid plan) |
| **ElephantSQL** | Tiny free "Tiny Turtle" plan (20MB) — fine for testing only, not real use |

Since this app already uses a plain `pg` Pool with a `DATABASE_URL`, switching providers later is just swapping the connection string in `backend/.env` — no code changes needed.

---

## 📁 Project Structure

```
sports-platform/
├── backend/
│   ├── .env                        ← your secrets (never commit)
│   └── src/
│       ├── config/
│       │   ├── db.js               ← Neon pg pool
│       │   ├── dbInit.js           ← table creation + seeding
│       │   └── cloudinary.js       ← image upload config
│       ├── controllers/            ← Auth, Sports, Teams, Players, Matches, Insights, Users
│       ├── middleware/             ← JWT auth, role guards
│       └── routes/                 ← Express routers
└── frontend/
    ├── .env.local                  ← frontend env (never commit)
    └── src/
        ├── app/                    ← Next.js 14 App Router pages
        ├── components/             ← Navbar, MatchCard
        ├── hooks/                  ← useAuth, useLiveMatch (Socket.io)
        ├── lib/                    ← API client, socket singleton
        └── types/                  ← TypeScript types
```

---

## 🌐 Pages

| Route | Description |
|---|---|
| `/` | Home — live matches, today's schedule, overview stats |
| `/login` | Login |
| `/matches` | All matches with status/sport filters |
| `/matches/[id]` | Live scoreboard + event timeline + score update panel |
| `/sports` | Sports catalogue |
| `/sports/[id]` | Sport detail — teams, matches |
| `/players` | Player grid with search |
| `/players/[id]` | Player profile, stats, events |
| `/teams/[id]` | Team roster + W/L record |
| `/insights` | Charts: leaderboard, standings, monthly trends |
| `/admin` | Admin dashboard |
| `/admin/sports` | Manage sports |
| `/admin/teams` | Manage teams + logos |
| `/admin/players` | Manage players + photos |
| `/admin/matches` | Schedule matches, change status |
| `/admin/users` | Create helpers, assign sports, manage roles |

---

## 🐙 GitHub Push (first time fix)

If you get a "large file" error, run `fix-github-push.bat` (Windows) or:

```bash
git rm -r --cached .
git add .
git commit -m "fix: remove node_modules from tracking"
git push -u origin main
```