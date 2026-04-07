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
  ], 'write');
}
