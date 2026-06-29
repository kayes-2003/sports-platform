# University Central Sports Platform

A full-stack live sports update platform built with Next.js + Node.js + PostgreSQL + Socket.io.

## Quick Start

### 1. Backend setup

```bash
cd backend
npm install          # installs all dependencies
```

Copy and fill in your environment variables:
```bash
# Edit backend/.env with your actual values:
# - DATABASE_URL  → your PostgreSQL connection string
# - JWT_SECRET    → any long random string
# - CLOUDINARY_*  → from cloudinary.com (free account)
```

Initialize database (creates tables + seeds 6 sports + admin user):
```bash
npm run db:init
```

Start the server:
```bash
npm run dev       # runs on http://localhost:4000
```

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `.env.local` in the frontend folder:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Start the frontend:
```bash
npm run dev       # runs on http://localhost:3000
```

### 3. Default login

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@sports.edu    | admin123   |

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+ (local or cloud like Neon/Supabase)
- Cloudinary account (free tier works fine)

---

## Project Structure

```
sports-platform/
├── backend/
│   └── src/
│       ├── config/       # DB pool, Cloudinary, DB init/seed
│       ├── controllers/  # Auth, Sports, Teams, Players, Matches, Insights, Users
│       ├── middleware/   # JWT auth, role guards
│       └── routes/       # Express routers
└── frontend/
    └── src/
        ├── app/          # Next.js 14 App Router pages
        ├── components/   # Navbar, MatchCard
        ├── hooks/        # useAuth, useLiveMatch (Socket.io)
        ├── lib/          # API client, socket singleton
        └── types/        # TypeScript types
```

---

## Pages

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

## GitHub Push (first time)

If you get a "large file" error from GitHub, it's because `node_modules` was accidentally added.
Run these commands to fix it:

```bash
# From the root sports-platform folder:
git rm -r --cached .
git add .
git commit -m "fix: remove node_modules from tracking"
git push -u origin main
```
