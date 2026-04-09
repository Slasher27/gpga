import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
    }

    client = createClient({ url, authToken });
  }
  return client;
}

export async function initSchema(): Promise<void> {
  const db = getClient();

  await db.batch([
    `CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      role TEXT DEFAULT 'player' CHECK(role IN ('master', 'admin', 'player')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      buy_in_amount INTEGER DEFAULT 0,
      medal_1st INTEGER DEFAULT 0,
      medal_2nd INTEGER DEFAULT 0,
      stableford_1st INTEGER DEFAULT 0,
      stableford_2nd INTEGER DEFAULT 0,
      team_1st INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS golf_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      par INTEGER DEFAULT 72,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      course_name TEXT NOT NULL,
      tee_time TEXT,
      tee_time_2 TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES golf_courses(id)
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      round_id INTEGER NOT NULL,
      strokes INTEGER DEFAULT 0,
      handicap INTEGER DEFAULT 0,
      stableford INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      UNIQUE(player_id, round_id)
    )`,
    `CREATE TABLE IF NOT EXISTS fine_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_open INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS player_fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      round_id INTEGER NOT NULL,
      fine_type_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      paid INTEGER DEFAULT 0,
      paid_date TEXT,
      confirmed INTEGER DEFAULT 0,
      confirmed_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (fine_type_id) REFERENCES fine_types(id) ON DELETE CASCADE,
      UNIQUE(player_id, round_id, fine_type_id)
    )`,
    `CREATE TABLE IF NOT EXISTS season_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      buy_in_paid INTEGER DEFAULT 0,
      buy_in_date TEXT,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(season_id, player_id)
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id),
      UNIQUE(season_id, player1_id),
      UNIQUE(season_id, player2_id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_scores_round ON scores(round_id)',
    'CREATE INDEX IF NOT EXISTS idx_players_email ON players(email)',
    'CREATE INDEX IF NOT EXISTS idx_rounds_date ON rounds(date)',
    'CREATE INDEX IF NOT EXISTS idx_rounds_season ON rounds(season_id)',
    'CREATE INDEX IF NOT EXISTS idx_fines_player ON player_fines(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_fines_round ON player_fines(round_id)',
    'CREATE INDEX IF NOT EXISTS idx_season_players ON season_players(season_id, player_id)',
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      round_id INTEGER,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id, read)',
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )`,
  ], 'write');

  // Migrations for existing tables
  try { await db.execute('ALTER TABLE fine_types ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE fine_types ADD COLUMN is_open INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE seasons ADD COLUMN medal_1st INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE seasons ADD COLUMN medal_2nd INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE seasons ADD COLUMN stableford_1st INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE seasons ADD COLUMN stableford_2nd INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE seasons ADD COLUMN team_1st INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE rounds ADD COLUMN tee_time TEXT'); } catch {}
  try { await db.execute('ALTER TABLE rounds ADD COLUMN tee_time_2 TEXT'); } catch {}
  try { await db.execute('ALTER TABLE rounds ADD COLUMN closed INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE players ADD COLUMN notify_email INTEGER DEFAULT 1'); } catch {}
  try { await db.execute('ALTER TABLE players ADD COLUMN notify_push INTEGER DEFAULT 1'); } catch {}

  // Add missing Western Cape courses
  await db.execute(`INSERT OR IGNORE INTO golf_courses (id, name, location, par) VALUES
    (31, 'Kingswood Golf Estate', 'George', 72),
    (32, 'Fancourt Links', 'George', 73),
    (33, 'Fancourt Montagu', 'George', 72),
    (34, 'Fancourt Outeniqua', 'George', 72),
    (35, 'Pinnacle Point Golf Club', 'Mossel Bay', 72),
    (36, 'Mossel Bay Golf Club', 'Mossel Bay', 72),
    (37, 'Simola Golf Estate', 'Knysna', 72),
    (38, 'Pezula Golf Club', 'Knysna', 72),
    (39, 'Goose Valley Golf Club', 'Plettenberg Bay', 72),
    (40, 'Langebaan Country Estate', 'Langebaan', 72),
    (41, 'Robertson Golf Club', 'Robertson', 72),
    (42, 'Worcester Golf Club', 'Worcester', 72),
    (43, 'Kleine Zalze Golf Club', 'Stellenbosch', 72),
    (44, 'Kuilsrivier Golf Club', 'Kuilsrivier', 72),
    (45, 'Swellendam Golf Club', 'Swellendam', 72),
    (46, 'Oubaai Golf Club', 'Herolds Bay', 72),
    (47, 'Val de Vie Estate Golf', 'Paarl', 72),
    (48, 'Wines of Africa Golf Club', 'Franschhoek', 72)`);
}
