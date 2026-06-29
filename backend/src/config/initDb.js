const pool = require('./db');
const bcrypt = require('bcryptjs');

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('admin','helper','visitor')),
  assigned_sport_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  scoring_unit VARCHAR(50) DEFAULT 'points',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  position VARCHAR(80),
  jersey_number INTEGER,
  age INTEGER,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  team_home_id UUID NOT NULL REFERENCES teams(id),
  team_away_id UUID NOT NULL REFERENCES teams(id),
  venue VARCHAR(200),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed','cancelled')),
  score_home INTEGER DEFAULT 0,
  score_away INTEGER DEFAULT 0,
  winner_team_id UUID REFERENCES teams(id),
  notes TEXT,
  tournament_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS score_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  event_type VARCHAR(60) NOT NULL,
  description TEXT,
  minute INTEGER,
  score_home_at_event INTEGER,
  score_away_at_event INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season VARCHAR(20) NOT NULL,
  matches_played INTEGER DEFAULT 0,
  goals_or_points INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  extra_stats JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, season)
);

-- ── TOURNAMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  format VARCHAR(30) NOT NULL DEFAULT 'single_elimination'
    CHECK (format IN ('single_elimination','double_elimination','round_robin','group_knockout')),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  venue VARCHAR(200),
  description TEXT,
  prize TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed INTEGER,
  group_name VARCHAR(10),
  UNIQUE(tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS bracket_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  round_name VARCHAR(80),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bracket_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES bracket_rounds(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  slot_number INTEGER NOT NULL,
  team_home_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_away_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  next_match_slot INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK additions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_users_sport') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_sport FOREIGN KEY (assigned_sport_id) REFERENCES sports(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_matches_tournament') THEN
    ALTER TABLE matches ADD CONSTRAINT fk_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_sport_id ON matches(sport_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_score_events_match_id ON score_events(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_tournament ON bracket_matches(tournament_id);
`;

// ── SEED DATA ────────────────────────────────────────────────────────────────

const footballPlayers = [
  // FC Jahangirnagar (jersey, position)
  ['Rafiq Ahmed',     1,  'Goalkeeper',      21],
  ['Tanvir Hossain',  2,  'Right Back',      22],
  ['Sumon Khan',      3,  'Centre Back',     23],
  ['Jahid Islam',     4,  'Centre Back',     20],
  ['Arif Uddin',      5,  'Left Back',       22],
  ['Mehedi Hassan',   6,  'Defensive Mid',   21],
  ['Rakib Hasan',     7,  'Central Mid',     22],
  ['Nayeem Akter',    8,  'Attacking Mid',   20],
  ['Sabbir Rahman',   9,  'Centre Forward',  23],
  ['Imran Hossain',  10,  'Right Wing',      21],
  ['Riyad Ahmed',    11,  'Left Wing',       22],
  // FC Dhaka United
  ['Karim Molla',     1,  'Goalkeeper',      24],
  ['Faisal Haque',    2,  'Right Back',      22],
  ['Touhid Islam',    3,  'Centre Back',     23],
  ['Shahin Alam',     4,  'Centre Back',     21],
  ['Mahfuz Rahman',   5,  'Left Back',       22],
  ['Asif Iqbal',      6,  'Defensive Mid',   20],
  ['Jubayer Hasan',   7,  'Central Mid',     23],
  ['Minhaj Uddin',    8,  'Attacking Mid',   21],
  ['Shakil Ahmed',    9,  'Centre Forward',  24],
  ['Nasir Hossain',  10,  'Right Wing',      22],
  ['Fahim Islam',    11,  'Left Wing',       21],
];

const cricketPlayers = [
  // JU Tigers
  ['Tamim Reza',       1,  'Opener/Batsman',     22],
  ['Sohan Mridha',     2,  'Opener/Batsman',     21],
  ['Ziaur Rahman',     3,  'Top Order Batsman',  23],
  ['Nahid Rana',       4,  'Middle Order',       22],
  ['Emon Hossain',     5,  'Middle Order',       21],
  ['Rifat Hasan',      6,  'All-Rounder',        23],
  ['Kafi Islam',       7,  'All-Rounder',        20],
  ['Sazzad Hossain',   8,  'Wicket Keeper',      22],
  ['Alamin Hossain',   9,  'Fast Bowler',        21],
  ['Rubel Mia',       10,  'Fast Bowler',        22],
  ['Monir Hossain',   11,  'Spin Bowler',        20],
  // Dhaka Royals
  ['Liton Das',        1,  'Opener/Batsman',     24],
  ['Nayeem Islam',     2,  'Opener/Batsman',     22],
  ['Taskin Ahmed',     3,  'Top Order Batsman',  23],
  ['Mushfiq Rahman',   4,  'Middle Order',       22],
  ['Hasan Mahmud',     5,  'Middle Order',       21],
  ['Towhid Hridoy',    6,  'All-Rounder',        23],
  ['Shaiful Islam',    7,  'All-Rounder',        20],
  ['Nurul Hasan',      8,  'Wicket Keeper',      24],
  ['Shoriful Islam',   9,  'Fast Bowler',        21],
  ['Rejaur Rahman',   10,  'Fast Bowler',        22],
  ['Nasum Ahmed',     11,  'Spin Bowler',        21],
];

const basketballPlayers = [
  // JU Ballers (5 starters + 5 bench = 10)
  ['Rony Hasan',       1,  'Point Guard',    21],
  ['Akash Ahmed',      2,  'Shooting Guard', 22],
  ['Maruf Islam',      3,  'Small Forward',  20],
  ['Sohel Rana',       4,  'Power Forward',  23],
  ['Tushar Khan',      5,  'Center',         22],
  ['Dipu Mia',         6,  'Point Guard',    21],
  ['Sajib Ahmed',      7,  'Shooting Guard', 20],
  ['Ruhul Amin',       8,  'Small Forward',  22],
  ['Farhan Islam',     9,  'Power Forward',  21],
  ['Sagor Hossain',   10,  'Center',         23],
  // Campus Rockets
  ['Polash Haque',     1,  'Point Guard',    22],
  ['Raihan Uddin',     2,  'Shooting Guard', 21],
  ['Mamun Rahman',     3,  'Small Forward',  23],
  ['Sujon Islam',      4,  'Power Forward',  20],
  ['Rimon Hossain',    5,  'Center',         22],
  ['Shafiq Ahmed',     6,  'Point Guard',    21],
  ['Bellal Mia',       7,  'Shooting Guard', 22],
  ['Nadim Hasan',      8,  'Small Forward',  20],
  ['Kayes Islam',      9,  'Power Forward',  23],
  ['Imtiaz Ahmed',    10,  'Center',         21],
];

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing database schema...');
    await client.query(schema);

    // ── Admin user ──
    const adminExists = await client.query("SELECT id FROM users WHERE email='admin@sports.edu'");
    if (adminExists.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)`,
        ['Super Admin','admin@sports.edu',hash,'admin']
      );
      console.log('👤 Admin: admin@sports.edu / admin123');
    }

    // ── Helper user ──
    const helperExists = await client.query("SELECT id FROM users WHERE email='helper@sports.edu'");
    if (helperExists.rows.length === 0) {
      const hash = await bcrypt.hash('helper123', 10);
      await client.query(
        `INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)`,
        ['Score Helper','helper@sports.edu',hash,'helper']
      );
      console.log('👤 Helper: helper@sports.edu / helper123');
    }

    // ── Sports ──
    const sportsData = [
      { name:'Football',    unit:'goals',  desc:'11-a-side association football' },
      { name:'Cricket',     unit:'runs',   desc:'Limited overs cricket' },
      { name:'Basketball',  unit:'points', desc:'5-a-side basketball' },
      { name:'Volleyball',  unit:'sets',   desc:'6-a-side volleyball' },
      { name:'Badminton',   unit:'points', desc:'Singles & doubles badminton' },
      { name:'Table Tennis',unit:'points', desc:'Singles & doubles table tennis' },
    ];
    for (const s of sportsData) {
      await client.query(
        `INSERT INTO sports (name,scoring_unit,description) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING`,
        [s.name,s.unit,s.desc]
      );
    }

    const sportsRows = await client.query('SELECT id,name FROM sports ORDER BY name');
    const sportMap = {};
    sportsRows.rows.forEach(r => { sportMap[r.name] = r.id; });

    // ── Teams (8 per sport) ──
    const teamsData = {
      'Football': [
        'FC Jahangirnagar','FC Dhaka United','Blue Lions FC','Red Devils FC',
        'Green Warriors FC','Golden Eagles FC','Thunder Bolts FC','Storm Riders FC'
      ],
      'Cricket': [
        'JU Tigers','Dhaka Royals','Savar Strikers','Gazipur Gladiators',
        'Narsingdi Knights','Mymensingh Marauders','Tangail Titans','Faridpur Falcons'
      ],
      'Basketball': [
        'JU Ballers','Campus Rockets','Net Busters','Slam Dunkers',
        'Fast Breakers','Rim Rockers','Court Kings','Hoop Legends'
      ],
      'Volleyball': [
        'JU Spikes','Block Masters','Ace Smasher','Set & Spike',
        'Net Ninjas','Sky Jumpers','Power Setters','Dig Deep'
      ],
      'Badminton': [
        'Shuttle Kings','Smash Brothers','Net Ninjas BD','Clear Smashers',
        'Drop Shot Masters','Fast Feathers','Court Rulers','Rally Kings'
      ],
      'Table Tennis': [
        'Spin Masters','Ping Pong Pros','Topspin Tigers','Table Kings',
        'Backhand Beasts','Forehand Force','Smash & Spin','Loop Masters'
      ],
    };

    const teamMap = {};
    for (const [sport, teams] of Object.entries(teamsData)) {
      const sid = sportMap[sport];
      if (!sid) continue;
      teamMap[sport] = [];
      for (const tname of teams) {
        const existing = await client.query(
          'SELECT id FROM teams WHERE name=$1 AND sport_id=$2', [tname, sid]
        );
        let tid;
        if (existing.rows.length > 0) {
          tid = existing.rows[0].id;
        } else {
          const res = await client.query(
            'INSERT INTO teams (name,sport_id) VALUES ($1,$2) RETURNING id', [tname, sid]
          );
          tid = res.rows[0].id;
        }
        teamMap[sport].push({ id: tid, name: tname });
      }
    }

    // ── Players for Football (first 2 teams detailed, rest auto-generated) ──
    const fbSid = sportMap['Football'];
    const fbTeams = teamMap['Football'];

    const footballDetailedPlayers = [
      { team: 0, players: footballPlayers.slice(0,11) },
      { team: 1, players: footballPlayers.slice(11,22) },
    ];

    const footballPositions = ['Goalkeeper','Right Back','Centre Back','Centre Back','Left Back','Defensive Mid','Central Mid','Attacking Mid','Centre Forward','Right Wing','Left Wing'];
    const footballNames = [
      ['Musa Karim','Babul Hasan','Shakib Alam','Yusuf Mia','Saiful Islam','Masum Billah','Limon Hossain','Anik Das','Sajid Ahmed','Rasel Khan','Mizan Molla'],
      ['Omar Faruk','Belal Islam','Habib Rahman','Jakir Hossain','Nurul Amin','Salam Mia','Kamal Uddin','Ziarul Islam','Babu Hossain','Tofael Ahmed','Robiul Islam'],
      ['Anwar Hossain','Dulal Mia','Harun Rashid','Jalal Uddin','Kawsar Ahmed','Liakat Ali','Mintu Hasan','Nuru Mia','Omar Ali','Prodip Das','Qasem Ali'],
      ['Rahim Uddin','Shamsul Haq','Titu Mia','Umar Faruk','Viku Das','Wahid Ali','Xabir Islam','Yahya Hasan','Zahir Ahmed','Abul Hossain','Billal Mia'],
      ['Chanchal Das','Dulal Ahmed','Ekram Hossain','Faruk Mia','Golam Hossain','Habibur Rahman','Ibrahim Khalil','Jamal Uddin','Keramat Ali','Lokhon Das'],
      ['Mamtaz Ali','Naeem Hossain','Omar Islam','Partho Das','Qamrul Islam','Rashid Ahmed','Sadek Ali','Tamzid Hossain','Ujjal Das','Valen Hossain'],
    ];

    for (let ti = 0; ti < fbTeams.length; ti++) {
      const team = fbTeams[ti];
      if (ti < 2) {
        const det = footballDetailedPlayers[ti];
        for (const p of det.players) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [p[0], team.id, fbSid, p[2], p[1], p[3]]
          );
        }
      } else {
        const names = footballNames[ti-2] || footballNames[0];
        for (let pi = 0; pi < 11; pi++) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [names[pi]||`Player ${pi+1}`, team.id, fbSid, footballPositions[pi], pi+1, 19+Math.floor(Math.random()*6)]
          );
        }
      }
    }

    // ── Players for Cricket ──
    const crSid = sportMap['Cricket'];
    const crTeams = teamMap['Cricket'];
    const cricketPositions = ['Opener/Batsman','Opener/Batsman','Top Order Batsman','Middle Order','Middle Order','All-Rounder','All-Rounder','Wicket Keeper','Fast Bowler','Fast Bowler','Spin Bowler'];
    const cricketNames = [
      ['Ashraf Ali','Badrul Islam','Chandan Mia','Dulal Hossain','Emran Ahmed','Farhan Mia','Golam Ali','Hasib Rahman','Imon Das','Jahangir Alam','Kalam Hossain'],
      ['Lakshman Das','Manik Mia','Nawab Ali','Omar Siddiq','Parvez Ahmed','Quddus Mia','Rashed Khan','Sadrul Amin','Tarek Islam','Uday Das','Vimal Hossain'],
      ['Wali Ahmed','Xasan Islam','Yeasin Hossain','Zayed Ali','Abir Das','Barkat Ali','Chayon Hossain','Dalim Ahmed','Emon Islam','Faysal Mia'],
      ['Gias Uddin','Helal Islam','Imrul Hossain','Jalil Mia','Kabir Ahmed','Latif Rahman','Montu Hossain','Nazrul Islam','Ohab Ali','Palash Das'],
      ['Quaium Mia','Ratan Hossain','Shorab Ali','Taher Ahmed','Uttam Das','Vijay Hossain','Wahab Islam','Xubayer Ali','Yamin Hossain','Zoha Das'],
      ['Arman Hossain','Borhan Islam','Cadet Ali','Dewan Hossain','Elias Ahmed','Firoz Mia','Golap Hossain','Hanif Islam','Iqbal Hossain','Jakaria Ali'],
    ];

    for (let ti = 0; ti < crTeams.length; ti++) {
      const team = crTeams[ti];
      if (ti < 2) {
        const players = ti === 0 ? cricketPlayers.slice(0,11) : cricketPlayers.slice(11,22);
        for (const p of players) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [p[0], team.id, crSid, p[2], p[1], p[3]]
          );
        }
      } else {
        const names = cricketNames[ti-2] || cricketNames[0];
        for (let pi = 0; pi < 11; pi++) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [names[pi]||`Player ${pi+1}`, team.id, crSid, cricketPositions[pi], pi+1, 19+Math.floor(Math.random()*6)]
          );
        }
      }
    }

    // ── Players for Basketball ──
    const bkSid = sportMap['Basketball'];
    const bkTeams = teamMap['Basketball'];
    const bkPositions = ['Point Guard','Shooting Guard','Small Forward','Power Forward','Center','Point Guard','Shooting Guard','Small Forward','Power Forward','Center'];
    const bkNames = [
      ['Anas Hossain','Barun Das','Chanchal Ali','Dip Mia','Elton Ahmed','Faruk Islam','Gani Hossain','Hridoy Das','Imran Ali','Jony Hossain'],
      ['Karim Das','Limon Ali','Masum Hossain','Nayan Islam','Omar Das','Polash Ali','Qader Hossain','Rana Das','Shafiul Islam','Tapon Hossain'],
      ['Uddin Ali','Varun Das','Wahidul Islam','Xabier Ali','Yemon Hossain','Zahid Das','Arif Islam','Babar Ali','Chapal Hossain','Dayal Das'],
      ['Ekbal Islam','Feroz Ali','Gonesh Hossain','Hiron Das','Ismail Ali','Jahed Hossain','Khokon Das','Labib Islam','Matin Ali','Noman Hossain'],
      ['Omar Islam','Pappu Das','Quais Ali','Ratan Islam','Sagor Das','Tamim Ali','Upal Hossain','Varun Islam','Wasim Das','Xan Ali'],
      ['Younus Hossain','Zaki Das','Abrar Islam','Biplob Ali','Chaity Hossain','Delwar Das','Enan Islam','Fardin Ali','Gonesh Das','Hafiz Hossain'],
    ];

    for (let ti = 0; ti < bkTeams.length; ti++) {
      const team = bkTeams[ti];
      if (ti < 2) {
        const players = ti === 0 ? basketballPlayers.slice(0,10) : basketballPlayers.slice(10,20);
        for (const p of players) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [p[0], team.id, bkSid, p[2], p[1], p[3]]
          );
        }
      } else {
        const names = bkNames[ti-2] || bkNames[0];
        for (let pi = 0; pi < 10; pi++) {
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [names[pi]||`Player ${pi+1}`, team.id, bkSid, bkPositions[pi], pi+1, 19+Math.floor(Math.random()*6)]
          );
        }
      }
    }

    // ── Auto-generate players for Volleyball, Badminton, Table Tennis ──
    const otherSports = [
      { name:'Volleyball',   positions:['Setter','Outside Hitter','Outside Hitter','Middle Blocker','Middle Blocker','Libero'], count:6 },
      { name:'Badminton',    positions:['Singles Player','Singles Player','Doubles Player','Doubles Player','Doubles Player','Reserve'], count:6 },
      { name:'Table Tennis', positions:['Singles Player','Singles Player','Doubles Player','Doubles Player','Reserve','Reserve'], count:6 },
    ];
    const genericNames = ['Alam','Hasan','Islam','Ahmed','Rahman','Hossain','Mia','Das','Ali','Khan','Uddin','Akter','Begum','Sultana','Khatun'];

    for (const sp of otherSports) {
      const sid = sportMap[sp.name];
      const teams = teamMap[sp.name] || [];
      for (const team of teams) {
        for (let pi = 0; pi < sp.count; pi++) {
          const fn = genericNames[Math.floor(Math.random()*8)];
          const ln = genericNames[8+Math.floor(Math.random()*7)];
          await client.query(`
            INSERT INTO players (name,team_id,sport_id,position,jersey_number,age)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [`${fn} ${ln}`, team.id, sid, sp.positions[pi], pi+1, 19+Math.floor(Math.random()*6)]
          );
        }
      }
    }

    // ── Matches: 5 completed, 2 live, 8 upcoming ──
    const fbTeamIds = fbTeams.map(t=>t.id);
    const crTeamIds = crTeams.map(t=>t.id);
    const bkTeamIds = bkTeams.map(t=>t.id);
    const vbTeamIds = (teamMap['Volleyball']||[]).map(t=>t.id);
    const fbSportId = sportMap['Football'];
    const crSportId = sportMap['Cricket'];
    const bkSportId = sportMap['Basketball'];
    const vbSportId = sportMap['Volleyball'];

    const matchesExist = await client.query('SELECT COUNT(*) FROM matches');
    if (parseInt(matchesExist.rows[0].count) < 5) {
      const now = new Date();
      const day = (d) => new Date(now.getTime() + d*86400000).toISOString();

      const matchesToInsert = [
        // Completed matches
        { sid:fbSportId, h:fbTeamIds[0], a:fbTeamIds[1], sh:3, sa:1, w:fbTeamIds[0], dt:day(-14), st:'completed', v:'JU Central Ground', notes:'Inter-department final. Brilliant performance by FC Jahangirnagar.' },
        { sid:crSportId, h:crTeamIds[0], a:crTeamIds[1], sh:187, sa:142, w:crTeamIds[0], dt:day(-10), st:'completed', v:'JU Cricket Ground', notes:'JU Tigers won by 45 runs in 20-over match.' },
        { sid:bkSportId, h:bkTeamIds[0], a:bkTeamIds[1], sh:78, sa:65, w:bkTeamIds[0], dt:day(-7), st:'completed', v:'JU Sports Complex', notes:'JU Ballers dominated with 13 point margin.' },
        { sid:fbSportId, h:fbTeamIds[2], a:fbTeamIds[3], sh:1, sa:2, w:fbTeamIds[3], dt:day(-5), st:'completed', v:'JU Central Ground', notes:'Red Devils secured victory with a late penalty.' },
        { sid:crSportId, h:crTeamIds[2], a:crTeamIds[3], sh:210, sa:205, w:crTeamIds[2], dt:day(-3), st:'completed', v:'JU Cricket Ground', notes:'Nail-biting finish, Savar Strikers won by 5 runs.' },
        { sid:bkSportId, h:bkTeamIds[2], a:bkTeamIds[3], sh:55, sa:70, w:bkTeamIds[3], dt:day(-2), st:'completed', v:'JU Sports Complex', notes:'Slam Dunkers had an outstanding second half.' },
        { sid:vbSportId, h:vbTeamIds[0], a:vbTeamIds[1], sh:3, sa:1, w:vbTeamIds[0], dt:day(-1), st:'completed', v:'JU Indoor Hall', notes:'JU Spikes won 3-1 in a competitive set battle.' },
        // Live matches
        { sid:fbSportId, h:fbTeamIds[4], a:fbTeamIds[5], sh:2, sa:2, w:null, dt:day(0), st:'live', v:'JU Central Ground', notes:'Exciting match in progress - level at half time.' },
        { sid:crSportId, h:crTeamIds[4], a:crTeamIds[5], sh:156, sa:89, w:null, dt:day(0), st:'live', v:'JU Cricket Ground', notes:'Mymensingh Marauders batting. 12 overs remaining.' },
        // Upcoming
        { sid:fbSportId, h:fbTeamIds[6], a:fbTeamIds[7], sh:0, sa:0, w:null, dt:day(1), st:'upcoming', v:'JU Central Ground', notes:'Quarter-final match.' },
        { sid:bkSportId, h:bkTeamIds[4], a:bkTeamIds[5], sh:0, sa:0, w:null, dt:day(2), st:'upcoming', v:'JU Sports Complex', notes:'Semi-final clash.' },
        { sid:crSportId, h:crTeamIds[6], a:crTeamIds[7], sh:0, sa:0, w:null, dt:day(3), st:'upcoming', v:'JU Cricket Ground', notes:'Group stage decider.' },
        { sid:fbSportId, h:fbTeamIds[0], a:fbTeamIds[2], sh:0, sa:0, w:null, dt:day(4), st:'upcoming', v:'JU Central Ground', notes:'Top of table clash.' },
        { sid:bkSportId, h:bkTeamIds[6], a:bkTeamIds[7], sh:0, sa:0, w:null, dt:day(5), st:'upcoming', v:'JU Sports Complex', notes:'Must-win game for both sides.' },
        { sid:vbSportId, h:vbTeamIds[2], a:vbTeamIds[3], sh:0, sa:0, w:null, dt:day(6), st:'upcoming', v:'JU Indoor Hall', notes:'First meeting between these two teams.' },
        { sid:crSportId, h:crTeamIds[0], a:crTeamIds[4], sh:0, sa:0, w:null, dt:day(7), st:'upcoming', v:'JU Cricket Ground', notes:'Champion vs challenger fixture.' },
        { sid:fbSportId, h:fbTeamIds[1], a:fbTeamIds[3], sh:0, sa:0, w:null, dt:day(8), st:'upcoming', v:'JU Central Ground', notes:'Rivalry match - always high intensity.' },
      ];

      for (const m of matchesToInsert) {
        await client.query(`
          INSERT INTO matches (sport_id,team_home_id,team_away_id,score_home,score_away,
            winner_team_id,scheduled_at,status,venue,notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [m.sid,m.h,m.a,m.sh,m.sa,m.w,m.dt,m.st,m.v,m.notes]
        );
      }
      console.log('⚽ Matches seeded: 7 completed, 2 live, 9 upcoming');
    }

    // ── Player stats ──
    const allPlayers = await client.query('SELECT id FROM players LIMIT 40');
    for (const p of allPlayers.rows) {
      await client.query(`
        INSERT INTO player_stats (player_id,season,matches_played,goals_or_points,assists,wins,losses)
        VALUES ($1,'2025',$2,$3,$4,$5,$6) ON CONFLICT (player_id,season) DO NOTHING`,
        [p.id,
         Math.floor(Math.random()*10)+3,
         Math.floor(Math.random()*12),
         Math.floor(Math.random()*8),
         Math.floor(Math.random()*7)+1,
         Math.floor(Math.random()*4)]
      );
    }

    // ── Sample Tournaments ──
    const adminUser = await client.query("SELECT id FROM users WHERE email='admin@sports.edu'");
    const adminId   = adminUser.rows[0]?.id;
    const tourExist = await client.query('SELECT COUNT(*) FROM tournaments');

    if (parseInt(tourExist.rows[0].count) === 0 && adminId) {
      // Football championship — 8 teams, single elimination
      const tourFb = await client.query(`
        INSERT INTO tournaments (name,sport_id,format,status,start_date,end_date,venue,description,prize,created_by)
        VALUES ($1,$2,'single_elimination','ongoing',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          'JU Inter-Department Football Championship 2025',
          fbSportId,
          new Date(Date.now()-7*86400000).toISOString().split('T')[0],
          new Date(Date.now()+14*86400000).toISOString().split('T')[0],
          'JU Central Ground, Jahangirnagar University',
          'Annual football championship among all departments. 8 teams compete in single elimination format.',
          'Champion Trophy + Medals for top 3 teams',
          adminId
        ]
      );
      const fbTourId = tourFb.rows[0].id;
      for (let i=0; i<8; i++) {
        await client.query(
          `INSERT INTO tournament_teams (tournament_id,team_id,seed) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [fbTourId, fbTeamIds[i], i+1]
        );
      }

      // Cricket cup — 8 teams, single elimination
      const tourCr = await client.query(`
        INSERT INTO tournaments (name,sport_id,format,status,start_date,end_date,venue,description,prize,created_by)
        VALUES ($1,$2,'single_elimination','upcoming',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          'JU Cricket Premier League 2025',
          crSportId,
          new Date(Date.now()+10*86400000).toISOString().split('T')[0],
          new Date(Date.now()+30*86400000).toISOString().split('T')[0],
          'JU Cricket Ground, Jahangirnagar University',
          'Premier cricket tournament featuring top 8 university teams competing for the coveted JU Cricket Cup.',
          'JU Cricket Cup + Prize Money',
          adminId
        ]
      );
      const crTourId = tourCr.rows[0].id;
      for (let i=0; i<8; i++) {
        await client.query(
          `INSERT INTO tournament_teams (tournament_id,team_id,seed) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [crTourId, crTeamIds[i], i+1]
        );
      }

      // Basketball — round robin, 4 teams
      const tourBk = await client.query(`
        INSERT INTO tournaments (name,sport_id,format,status,start_date,end_date,venue,description,prize,created_by)
        VALUES ($1,$2,'round_robin','upcoming',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          'JU Basketball Round Robin 2025',
          bkSportId,
          new Date(Date.now()+5*86400000).toISOString().split('T')[0],
          new Date(Date.now()+12*86400000).toISOString().split('T')[0],
          'JU Sports Complex Indoor Court',
          'Round robin league format — all 4 teams play each other twice. Top 2 advance to final.',
          'Champion Shield',
          adminId
        ]
      );
      const bkTourId = tourBk.rows[0].id;
      for (let i=0; i<4; i++) {
        await client.query(
          `INSERT INTO tournament_teams (tournament_id,team_id,seed) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [bkTourId, bkTeamIds[i], i+1]
        );
      }

      console.log('🏆 3 sample tournaments seeded (Football, Cricket, Basketball)');

      // Auto-generate SE bracket for Football tournament
      const fbTeamSeeds = fbTeamIds.slice(0,8).map((tid,i) => ({ team_id: tid, seed: i+1 }));
      await generateSEBracket(client, fbTourId, fbTeamSeeds);
      console.log('🌳 Football bracket auto-generated');
    }

    console.log('✅ Database fully initialized with seed data!');
  } catch (err) {
    console.error('❌ Init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Inline bracket generator for seeding (uses passed client)
async function generateSEBracket(client, tournamentId, teams) {
  let n = 1;
  while (n < teams.length) n *= 2;
  const roundNames = { 1:'Final', 2:'Semi-Final', 4:'Quarter-Final', 8:'Round of 16' };
  const totalRounds = Math.log2(n);
  const roundIds = [];

  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = n / Math.pow(2, r+1);
    const rName = roundNames[matchesInRound] || `Round of ${matchesInRound*2}`;
    const rRow = await client.query(
      `INSERT INTO bracket_rounds (tournament_id,round_number,round_name) VALUES ($1,$2,$3) RETURNING id`,
      [tournamentId, r+1, rName]
    );
    roundIds.push(rRow.rows[0].id);
  }

  function buildPairs(n) {
    if (n===2) return [[1,2]];
    const half=n/2; const pairs=[]; const prev=buildPairs(half);
    for (const [a,b] of prev) { pairs.push([a,n+1-a]); pairs.push([b,n+1-b]); }
    const reordered=[];
    for (let i=0;i<prev.length;i++) { reordered.push(pairs[i*2]); reordered.push(pairs[i*2+1]); }
    return reordered;
  }

  const pairs = buildPairs(n);
  const firstRoundId = roundIds[0];
  const matchesInFirst = n/2;

  for (let slot=0; slot<matchesInFirst; slot++) {
    const [s1,s2] = pairs[slot];
    const t1 = teams[s1-1]||null;
    const t2 = teams[s2-1]||null;
    await client.query(
      `INSERT INTO bracket_matches (tournament_id,round_id,slot_number,team_home_id,team_away_id) VALUES ($1,$2,$3,$4,$5)`,
      [tournamentId, firstRoundId, slot+1, t1?.team_id||null, t2?.team_id||null]
    );
  }

  for (let r=1; r<totalRounds; r++) {
    const matchesInRound = n/Math.pow(2,r+1);
    for (let slot=0; slot<matchesInRound; slot++) {
      await client.query(
        `INSERT INTO bracket_matches (tournament_id,round_id,slot_number,team_home_id,team_away_id) VALUES ($1,$2,$3,NULL,NULL)`,
        [tournamentId, roundIds[r], slot+1]
      );
    }
  }
}

initDb().then(() => process.exit(0)).catch(() => process.exit(1));
// This file already ends with initDb() call — patch is in the middle via the main block
