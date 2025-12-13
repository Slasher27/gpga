import initSqlJs from 'sql.js';
import type {
  Player,
  Season,
  GolfCourse,
  Round,
  PlayerScores,
  PlayerFines,
  PlayerFineWithDetails,
  FineType,
  PlayerUpdate,
  RoundUpdate,
  FineTypeUpdate,
  NewPlayer,
  NewRound,
  AuthUser,
  Database as DBType,
  SqlJsStatic
} from './types';

let db: DBType | null = null;
let SQL: SqlJsStatic | null = null;

// Initialize the database
export async function initDatabase(): Promise<DBType> {
  if (db) return db;

  try {
    // Initialize SQL.js
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    // FORCE RESET - version bump to clear old data
    const DB_VERSION = '5.2';
    const savedVersion = localStorage.getItem('gpga_db_version');

    if (savedVersion !== DB_VERSION) {
      console.log('🔄 Forcing database reset to version', DB_VERSION);
      localStorage.removeItem('gpga_sqlite_db');
      localStorage.removeItem('gpga_authenticated');
      localStorage.removeItem('gpga_current_user');
      localStorage.setItem('gpga_db_version', DB_VERSION);
    }

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('gpga_sqlite_db');

    if (savedDb) {
      // Load existing database
      const uint8Array = new Uint8Array(JSON.parse(savedDb));
      if (!SQL) throw new Error('SQL not initialized');
      db = new SQL.Database(uint8Array);
      console.log('✅ Loaded existing database from localStorage');

      // Check if schema needs migration
      const needsMigration = checkSchemaMigration();
      if (needsMigration) {
        console.log('⚠️ Old schema detected. Resetting database...');
        if (!SQL) throw new Error('SQL not initialized');
        db = new SQL.Database();
        await runSchema();
        await runSeed();
      }
    } else {
      // Create new database
      if (!SQL) throw new Error('SQL not initialized');
      db = new SQL.Database();
      console.log('✅ Created new database');

      // Run schema
      await runSchema();

      // Run seed data
      await runSeed();
    }

    // Save database to localStorage whenever it changes
    setupAutoSave();

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Check if database schema needs migration
function checkSchemaMigration(): boolean {
  if (!db) return true;

  try {
    // Check if all required tables exist
    const requiredTables = ['seasons', 'golf_courses', 'fine_types', 'player_fines'];

    for (const tableName of requiredTables) {
      const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
      if (!result.length || result[0].values.length === 0) {
        console.log(`⚠️ Missing table: ${tableName}`);
        return true;
      }
    }

    // Check if scores table has new columns (handicap, stableford)
    const scoresCheck = db.exec("PRAGMA table_info(scores)");
    if (scoresCheck.length) {
      const columns = scoresCheck[0].values.map(row => row[1]);
      if (!columns.includes('handicap') || !columns.includes('stableford')) {
        console.log('⚠️ Scores table missing new columns');
        return true;
      }
    }

    // Check if rounds table has new columns (course_id, course_name)
    const roundsCheck = db.exec("PRAGMA table_info(rounds)");
    if (roundsCheck.length) {
      const columns = roundsCheck[0].values.map(row => row[1]);
      if (!columns.includes('course_id') || !columns.includes('course_name')) {
        console.log('⚠️ Rounds table missing new columns');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log('⚠️ Schema check error:', (error as Error).message);
    return true;
  }
}

// Run schema SQL
async function runSchema(): Promise<void> {
  if (!db) return;

  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'player' CHECK(role IN ('master', 'admin', 'player')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        buy_in_amount INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS golf_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        par INTEGER DEFAULT 72,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rounds (
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
    );

    CREATE TABLE IF NOT EXISTS scores (
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
    );

    CREATE TABLE IF NOT EXISTS fine_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS player_fines (
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
    );

    CREATE TABLE IF NOT EXISTS season_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        buy_in_paid INTEGER DEFAULT 0,
        buy_in_date TEXT,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(season_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
    CREATE INDEX IF NOT EXISTS idx_scores_round ON scores(round_id);
    CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
    CREATE INDEX IF NOT EXISTS idx_rounds_date ON rounds(date);
    CREATE INDEX IF NOT EXISTS idx_rounds_season ON rounds(season_id);
    CREATE INDEX IF NOT EXISTS idx_fines_player ON player_fines(player_id);
    CREATE INDEX IF NOT EXISTS idx_fines_round ON player_fines(round_id);
    CREATE INDEX IF NOT EXISTS idx_season_players ON season_players(season_id, player_id);
  `;

  db.run(schemaSQL);
  console.log('✅ Schema created');
}

// Run seed data
async function runSeed(): Promise<void> {
  if (!db) return;

  const seedSQL = `
    INSERT OR IGNORE INTO players (id, name, email, password, role, status, avatar) VALUES
    ('1', 'Wayne Windt', 'wayne@gpga.com', 'password', 'player', 'active', NULL),
    ('2', 'Ryan Ambrose', 'ryan.a@gpga.com', 'password', 'player', 'active', NULL),
    ('3', 'Duwayne Cowney', 'duwayne@gpga.com', 'password', 'master', 'active', NULL),
    ('4', 'Ryan Strauss', 'ryan.s@gpga.com', 'password', 'player', 'active', NULL),
    ('5', 'Justin Fish', 'justin@gpga.com', 'password', 'player', 'active', NULL),
    ('6', 'Gareth Williams', 'gareth.w@gpga.com', 'password', 'player', 'active', NULL),
    ('7', 'Gareth Roos', 'gareth.r@gpga.com', 'password', 'player', 'active', NULL),
    ('8', 'Charl Cordier', 'charl@gpga.com', 'password', 'player', 'active', NULL);

    INSERT OR IGNORE INTO seasons (id, year, name, buy_in_amount, is_active) VALUES
    (1, 2025, 'GPGA 2025 Season', 500, 1);

    -- Golf Courses in Cape Town, Stellenbosch, and Paarl
    INSERT OR IGNORE INTO golf_courses (id, name, location, par) VALUES
    -- Cape Town - Southern Suburbs
    (1, 'Royal Cape Golf Club', 'Cape Town', 72),
    (2, 'Rondebosch Golf Club', 'Cape Town', 70),
    (3, 'Mowbray Golf Club', 'Cape Town', 72),
    (4, 'King David Mowbray Golf Club', 'Cape Town', 72),
    (5, 'Westlake Golf Club', 'Cape Town', 72),
    (6, 'Clovelly Country Club', 'Cape Town', 72),
    (7, 'Steenberg Golf Club', 'Cape Town', 72),
    (8, 'Retreat Golf Club', 'Cape Town', 71),
    -- Cape Town - Northern Suburbs
    (9, 'Durbanville Golf Club', 'Cape Town', 72),
    (10, 'Bellville Golf Club', 'Cape Town', 72),
    (11, 'Parow Golf Club', 'Cape Town', 72),
    (12, 'Kuils River Golf Club', 'Cape Town', 72),
    (13, 'Strand Golf Club', 'Cape Town', 72),
    (14, 'Somerset West Golf Club', 'Cape Town', 72),
    -- Cape Town - West Coast & Atlantic Seaboard
    (15, 'Milnerton Golf Club', 'Cape Town', 72),
    (16, 'Atlantic Beach Golf Club', 'Cape Town', 72),
    (17, 'Metropolitan Golf Club', 'Cape Town', 72),
    -- Cape Town - Other
    (18, 'Silwerstroom Golf Estate', 'Cape Town', 72),
    (19, 'Fisantekraal Golf Club', 'Cape Town', 72),
    (20, 'Sunrise Golf Club', 'Cape Town', 71),
    (21, 'Rocklands Golf Club', 'Cape Town', 72),
    (22, 'Hermanus Golf Club', 'Hermanus', 72),
    (23, 'Arabella Golf Club', 'Kleinmond', 72),
    -- Stellenbosch
    (24, 'Stellenbosch Golf Club', 'Stellenbosch', 72),
    (25, 'Erinvale Estate Hotel & Spa', 'Stellenbosch', 72),
    (26, 'De Zalze Golf Club', 'Stellenbosch', 72),
    (27, 'Devonvale Golf & Wine Estate', 'Stellenbosch', 72),
    -- Paarl
    (28, 'Pearl Valley Golf Estate', 'Paarl', 72),
    (29, 'Boschenmeer Golf Estate', 'Paarl', 72),
    (30, 'Paarl Golf Club', 'Paarl', 72);

    INSERT OR IGNORE INTO rounds (id, season_id, name, date, course_id, course_name) VALUES
    (1, 1, 'Round 1', '2025-01-10', 9, 'Durbanville Golf Club'),
    (2, 1, 'Round 2', '2025-02-14', 15, 'Milnerton Golf Club'),
    (3, 1, 'Round 3', '2025-03-10', 6, 'Clovelly Country Club'),
    (4, 1, 'Round 4', '2025-04-12', 30, 'Paarl Golf Club'),
    (5, 1, 'Round 5', '2025-05-15', 25, 'Erinvale Estate Hotel & Spa'),
    (6, 1, 'Round 6', '2025-06-20', 28, 'Pearl Valley Golf Estate');

    INSERT OR IGNORE INTO fine_types (id, season_id, name, amount, description) VALUES
    (1, 1, 'Late Arrival', 50, 'Arriving late to tee time'),
    (2, 1, 'Slow Play', 100, 'Holding up the group'),
    (3, 1, 'Lost Ball', 20, 'Per ball lost'),
    (4, 1, 'No Show', 200, 'Missing a round without notice'),
    (5, 1, 'Dress Code Violation', 30, 'Not adhering to dress code');

    INSERT OR IGNORE INTO scores (player_id, round_id, strokes) VALUES
    ('1', 1, 77), ('1', 2, 71), ('1', 3, 79), ('1', 4, 77), ('1', 5, 71), ('1', 6, 85),
    ('2', 1, 74), ('2', 2, 77), ('2', 3, 73), ('2', 4, 79), ('2', 5, 79), ('2', 6, 84),
    ('3', 1, 72), ('3', 2, 73), ('3', 3, 81), ('3', 4, 79), ('3', 5, 70), ('3', 6, 80),
    ('4', 1, 76), ('4', 2, 69), ('4', 3, 75), ('4', 4, 80), ('4', 5, 73), ('4', 6, 77),
    ('5', 1, 78), ('5', 2, 76), ('5', 3, 74), ('5', 4, 87), ('5', 5, 80), ('5', 6, 83),
    ('6', 1, 78), ('6', 2, 77), ('6', 3, 88), ('6', 4, 79), ('6', 5, 75), ('6', 6, 79),
    ('7', 1, 77), ('7', 2, 72), ('7', 3, 78), ('7', 4, 77), ('7', 5, 74), ('7', 6, 89),
    ('8', 1, 72);

    INSERT OR IGNORE INTO season_players (season_id, player_id, buy_in_paid, buy_in_date) VALUES
    (1, '1', 1, '2025-01-05'),
    (1, '2', 1, '2025-01-06'),
    (1, '3', 1, '2025-01-05'),
    (1, '4', 1, '2025-01-07'),
    (1, '5', 0, NULL),
    (1, '6', 1, '2025-01-08'),
    (1, '7', 1, '2025-01-09'),
    (1, '8', 0, NULL);
  `;

  db.run(seedSQL);
  console.log('✅ Seed data inserted');
}

// Setup auto-save to localStorage
function setupAutoSave(): void {
  // Save immediately
  saveDatabase();
}

// Save database to localStorage
export function saveDatabase(): void {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = JSON.stringify(Array.from(data));
    localStorage.setItem('gpga_sqlite_db', buffer);
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Query helpers
export function getAllPlayers(): Player[] {
  if (!db) return [];

  const result = db.exec('SELECT * FROM players ORDER BY name');
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    email: row[2] as string,
    password: row[3] as string,
    role: row[4] as 'admin' | 'player',
    status: row[5] as 'active' | 'inactive',
    avatar: row[6] as string | null
  }));
}

export function getActiveSeason(): Season | null {
  if (!db) return null;

  const result = db.exec('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1');
  if (!result.length) return null;

  const row = result[0].values[0];
  return {
    id: row[0] as number,
    year: row[1] as number,
    name: row[2] as string,
    buy_in_amount: row[3] as number,
    is_active: row[4] as number
  };
}

export function getAllSeasons(): Season[] {
  if (!db) return [];

  const result = db.exec('SELECT * FROM seasons ORDER BY year DESC');
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    year: row[1] as number,
    name: row[2] as string,
    buy_in_amount: row[3] as number,
    is_active: row[4] as number
  }));
}

export function getAllRounds(seasonId: number | null = null): Round[] {
  if (!db) return [];

  let sql = 'SELECT * FROM rounds';
  const params: number[] = [];

  if (seasonId) {
    sql += ' WHERE season_id = ?';
    params.push(seasonId);
  }

  sql += ' ORDER BY date';

  const result = db.exec(sql, params);
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    season_id: row[1] as number,
    name: row[2] as string,
    date: row[3] as string,
    course_id: row[4] as number,
    course_name: row[5] as string,
    course: row[5] as string // Keep for backwards compatibility
  }));
}

export function getAllScores(): PlayerScores {
  if (!db) return {};

  const result = db.exec('SELECT player_id, round_id, strokes, handicap, stableford FROM scores');
  if (!result.length) return {};

  const scores: PlayerScores = {};
  result[0].values.forEach(row => {
    const playerId = row[0] as string;
    const roundId = row[1] as number;
    const strokes = row[2] as number;
    const handicap = (row[3] as number) || 0;
    const stableford = (row[4] as number) || 0;

    if (!scores[playerId]) {
      scores[playerId] = {};
    }
    scores[playerId][roundId] = { strokes, handicap, stableford };
  });

  return scores;
}

// Get total fines per player per round
export function getPlayerFinesByRound(): PlayerFines {
  if (!db) return {};

  const sql = `
    SELECT
      pf.player_id,
      pf.round_id,
      SUM(ft.amount * pf.quantity) as total_fines
    FROM player_fines pf
    JOIN fine_types ft ON pf.fine_type_id = ft.id
    GROUP BY pf.player_id, pf.round_id
  `;

  const result = db.exec(sql);
  if (!result.length) return {};

  const fines: PlayerFines = {};
  result[0].values.forEach(row => {
    const playerId = row[0] as string;
    const roundId = row[1] as number;
    const totalFines = (row[2] as number) || 0;

    if (!fines[playerId]) {
      fines[playerId] = {};
    }
    fines[playerId][roundId] = totalFines;
  });

  return fines;
}

export function addPlayer(player: NewPlayer): void {
  if (!db) return;

  db.run(
    'INSERT INTO players (id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [player.id, player.name, player.email, player.password || 'password', player.role, player.status, player.avatar]
  );
  saveDatabase();
}

export function updatePlayer(id: string, updates: PlayerUpdate): void {
  if (!db) return;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }

  values.push(id);

  db.run(`UPDATE players SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  saveDatabase();
}

export function deletePlayer(id: string): void {
  if (!db) return;

  db.run('DELETE FROM players WHERE id = ?', [id]);
  saveDatabase();
}

// Golf Courses Management
export function getAllGolfCourses(): GolfCourse[] {
  if (!db) return [];

  const result = db.exec('SELECT * FROM golf_courses ORDER BY location, name');
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    name: row[1] as string,
    location: row[2] as string,
    par: row[3] as number
  }));
}

export function searchGolfCourses(searchTerm: string): GolfCourse[] {
  if (!db) return [];

  const sql = `
    SELECT * FROM golf_courses
    WHERE name LIKE ? OR location LIKE ?
    ORDER BY location, name
  `;
  const result = db.exec(sql, [`%${searchTerm}%`, `%${searchTerm}%`]);
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    name: row[1] as string,
    location: row[2] as string,
    par: row[3] as number
  }));
}

export function addRound(round: NewRound, seasonId: number): number {
  if (!db) return 0;

  db.run(
    'INSERT INTO rounds (season_id, name, date, course_id, course_name) VALUES (?, ?, ?, ?, ?)',
    [seasonId, round.name, round.date, round.courseId, round.courseName]
  );
  saveDatabase();

  // Get the last inserted ID
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0] as number;
}

export function updateRound(id: number, updates: RoundUpdate): void {
  if (!db) return;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
  if (updates.courseId !== undefined) { fields.push('course_id = ?'); values.push(updates.courseId); }
  if (updates.courseName !== undefined) { fields.push('course_name = ?'); values.push(updates.courseName); }

  values.push(id);

  db.run(`UPDATE rounds SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  saveDatabase();
}

export function deleteRound(id: number): void {
  if (!db) return;

  db.run('DELETE FROM rounds WHERE id = ?', [id]);
  saveDatabase();
}

export function updateScore(playerId: string, roundId: number, strokes: number, handicap: number = 0, stableford: number = 0): void {
  if (!db) return;

  db.run(
    'INSERT OR REPLACE INTO scores (player_id, round_id, strokes, handicap, stableford) VALUES (?, ?, ?, ?, ?)',
    [playerId, roundId, strokes, handicap, stableford]
  );
  saveDatabase();
}

// Fine Types Management
export function getFineTypes(seasonId: number): FineType[] {
  if (!db) {
    console.warn('Database not initialized in getFineTypes');
    return [];
  }
  const result = db.exec('SELECT * FROM fine_types WHERE season_id = ? ORDER BY name', [seasonId]);
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    season_id: row[1] as number,
    name: row[2] as string,
    amount: row[3] as number,
    description: row[4] as string
  }));
}

export function addFineType(seasonId: number, name: string, amount: number, description: string = ''): number {
  if (!db) return 0;

  db.run(
    'INSERT INTO fine_types (season_id, name, amount, description) VALUES (?, ?, ?, ?)',
    [seasonId, name, amount, description]
  );
  saveDatabase();

  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0] as number;
}

export function updateFineType(id: number, updates: FineTypeUpdate): void {
  if (!db) return;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }

  values.push(id);

  db.run(`UPDATE fine_types SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

export function deleteFineType(id: number): void {
  if (!db) return;

  db.run('DELETE FROM fine_types WHERE id = ?', [id]);
  saveDatabase();
}

// Player Fines Management
export function getPlayerFinesForRound(playerId: string, roundId: number): PlayerFineWithDetails[] {
  if (!db) {
    console.warn('Database not initialized in getPlayerFinesForRound');
    return [];
  }
  const sql = `
    SELECT
      pf.id,
      pf.fine_type_id,
      ft.name,
      ft.amount,
      pf.quantity,
      pf.paid
    FROM player_fines pf
    JOIN fine_types ft ON pf.fine_type_id = ft.id
    WHERE pf.player_id = ? AND pf.round_id = ?
  `;

  const result = db.exec(sql, [playerId, roundId]);
  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    player_id: playerId,
    round_id: roundId,
    fine_type_id: row[1] as number,
    name: row[2] as string,
    amount: row[3] as number,
    quantity: row[4] as number,
    paid: row[5] as number
  }));
}

export function setPlayerFine(playerId: string, roundId: number, fineTypeId: number, quantity: number): void {
  if (!db) return;

  if (quantity <= 0) {
    // Remove the fine if quantity is 0 or less
    db.run(
      'DELETE FROM player_fines WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
      [playerId, roundId, fineTypeId]
    );
  } else {
    // Check if record exists
    const exists = db.exec(
      'SELECT id FROM player_fines WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
      [playerId, roundId, fineTypeId]
    );

    if (exists.length && exists[0].values.length > 0) {
      // Update existing record
      db.run(
        'UPDATE player_fines SET quantity = ? WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
        [quantity, playerId, roundId, fineTypeId]
      );
    } else {
      // Insert new record
      db.run(
        'INSERT INTO player_fines (player_id, round_id, fine_type_id, quantity) VALUES (?, ?, ?, ?)',
        [playerId, roundId, fineTypeId, quantity]
      );
    }
  }
  saveDatabase();
}

export function addPlayerFine(playerId: string, roundId: number, fineTypeId: number): void {
  if (!db) return;

  // Get current quantity
  const result = db.exec(
    'SELECT quantity FROM player_fines WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
    [playerId, roundId, fineTypeId]
  );

  const currentQuantity = result.length ? (result[0].values[0][0] as number) : 0;
  setPlayerFine(playerId, roundId, fineTypeId, currentQuantity + 1);
}

export function removePlayerFine(playerId: string, roundId: number, fineTypeId: number): void {
  if (!db) return;

  // Get current quantity
  const result = db.exec(
    'SELECT quantity FROM player_fines WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
    [playerId, roundId, fineTypeId]
  );

  if (!result.length) return;

  const currentQuantity = result[0].values[0][0] as number;
  setPlayerFine(playerId, roundId, fineTypeId, currentQuantity - 1);
}

// Mark fine as paid
export function markFinePaid(playerId: string, roundId: number, fineTypeId: number, paid: boolean): void {
  if (!db) return;

  const paidDate = paid ? new Date().toISOString().split('T')[0] : null;

  db.run(
    'UPDATE player_fines SET paid = ?, paid_date = ? WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
    [paid ? 1 : 0, paidDate, playerId, roundId, fineTypeId]
  );

  saveDatabase();
}

// Mark all fines for a player as paid
export function markAllPlayerFinesPaid(playerId: string, paid: boolean): void {
  if (!db) return;

  const paidDate = paid ? new Date().toISOString().split('T')[0] : null;

  db.run(
    'UPDATE player_fines SET paid = ?, paid_date = ? WHERE player_id = ?',
    [paid ? 1 : 0, paidDate, playerId]
  );

  saveDatabase();
}

// Mark all fines for a player in a specific round as paid
export function markRoundFinesPaid(playerId: string, roundId: number, paid: boolean): void {
  if (!db) return;

  const paidDate = paid ? new Date().toISOString().split('T')[0] : null;

  db.run(
    'UPDATE player_fines SET paid = ?, paid_date = ? WHERE player_id = ? AND round_id = ?',
    [paid ? 1 : 0, paidDate, playerId, roundId]
  );

  saveDatabase();
}

// Confirm/lock player's fines for a round (admin closes the fine session)
export function confirmPlayerRoundFines(playerId: string, roundId: number, confirmed: boolean): void {
  if (!db) return;

  const confirmedDate = confirmed ? new Date().toISOString().split('T')[0] : null;

  db.run(
    'UPDATE player_fines SET confirmed = ?, confirmed_date = ? WHERE player_id = ? AND round_id = ?',
    [confirmed ? 1 : 0, confirmedDate, playerId, roundId]
  );

  saveDatabase();
}

// Check if player's round fines are confirmed
export function isPlayerRoundConfirmed(playerId: string, roundId: number): boolean {
  if (!db) return false;

  const result = db.exec(`
    SELECT confirmed FROM player_fines
    WHERE player_id = ? AND round_id = ?
    LIMIT 1
  `, [playerId, roundId]);

  if (result.length === 0 || result[0].values.length === 0) return false;
  return result[0].values[0][0] === 1;
}

// Get all fines for a specific round (all players)
export function getRoundFines(roundId: number): PlayerFineWithDetails[] {
  if (!db) return [];

  const result = db.exec(`
    SELECT
      pf.id,
      pf.player_id,
      pf.round_id,
      pf.fine_type_id,
      pf.quantity,
      pf.paid,
      pf.paid_date,
      pf.confirmed,
      pf.confirmed_date,
      pf.created_at,
      ft.name,
      ft.amount,
      p.name as player_name
    FROM player_fines pf
    JOIN fine_types ft ON pf.fine_type_id = ft.id
    JOIN players p ON pf.player_id = p.id
    WHERE pf.round_id = ?
    ORDER BY p.name, ft.name
  `, [roundId]);

  if (!result.length) return [];

  return result[0].values.map(row => ({
    id: row[0] as number,
    player_id: row[1] as string,
    round_id: row[2] as number,
    fine_type_id: row[3] as number,
    quantity: row[4] as number,
    paid: row[5] as number,
    paid_date: row[6] as string | undefined,
    confirmed: row[7] as number,
    confirmed_date: row[8] as string | undefined,
    created_at: row[9] as string | undefined,
    name: row[10] as string,
    amount: row[11] as number,
    player_name: row[12] as string
  })) as PlayerFineWithDetails[];
}

// Get payment summary for all players
export function getPaymentSummary(): Array<{
  player_id: string;
  player_name: string;
  total_fines: number;
  paid_fines: number;
  unpaid_fines: number;
  payment_percentage: number;
}> {
  if (!db) return [];

  const result = db.exec(`
    SELECT
      p.id as player_id,
      p.name as player_name,
      COALESCE(SUM(pf.quantity * ft.amount), 0) as total_fines,
      COALESCE(SUM(CASE WHEN pf.paid = 1 THEN pf.quantity * ft.amount ELSE 0 END), 0) as paid_fines,
      COALESCE(SUM(CASE WHEN pf.paid = 0 THEN pf.quantity * ft.amount ELSE 0 END), 0) as unpaid_fines
    FROM players p
    LEFT JOIN player_fines pf ON p.id = pf.player_id
    LEFT JOIN fine_types ft ON pf.fine_type_id = ft.id
    GROUP BY p.id, p.name
    ORDER BY total_fines DESC
  `);

  if (!result.length) return [];

  return result[0].values.map(row => {
    const totalFines = row[2] as number;
    const paidFines = row[3] as number;
    return {
      player_id: row[0] as string,
      player_name: row[1] as string,
      total_fines: totalFines,
      paid_fines: paidFines,
      unpaid_fines: row[4] as number,
      payment_percentage: totalFines > 0 ? Math.round((paidFines / totalFines) * 100) : 100
    };
  });
}

// Get player fines breakdown by round
export function getPlayerRoundFines(playerId: string): Array<{
  round_id: number;
  round_name: string;
  round_date: string;
  total_amount: number;
  paid: boolean;
  confirmed: boolean;
}> {
  if (!db) return [];

  const result = db.exec(`
    SELECT
      r.id as round_id,
      r.name as round_name,
      r.date as round_date,
      SUM(pf.quantity * ft.amount) as total_amount,
      MIN(pf.paid) as all_paid,
      MIN(pf.confirmed) as all_confirmed
    FROM rounds r
    INNER JOIN player_fines pf ON r.id = pf.round_id
    INNER JOIN fine_types ft ON pf.fine_type_id = ft.id
    WHERE pf.player_id = ?
    GROUP BY r.id, r.name, r.date
    ORDER BY r.date DESC
  `, [playerId]);

  if (!result.length) return [];

  return result[0].values.map(row => ({
    round_id: row[0] as number,
    round_name: row[1] as string,
    round_date: row[2] as string,
    total_amount: row[3] as number,
    paid: (row[4] as number) === 1,
    confirmed: (row[5] as number) === 1
  }));
}

// Get player's fines summary (for profile view)
export function getPlayerFinesSummary(playerId: string): {
  total_fines: number;
  paid_fines: number;
  outstanding_fines: number;
  confirmed_rounds: number;
  total_rounds_with_fines: number;
} {
  if (!db) return {
    total_fines: 0,
    paid_fines: 0,
    outstanding_fines: 0,
    confirmed_rounds: 0,
    total_rounds_with_fines: 0
  };

  const result = db.exec(`
    SELECT
      SUM(pf.quantity * ft.amount) as total_fines,
      SUM(CASE WHEN pf.paid = 1 THEN pf.quantity * ft.amount ELSE 0 END) as paid_fines,
      SUM(CASE WHEN pf.paid = 0 THEN pf.quantity * ft.amount ELSE 0 END) as outstanding_fines,
      COUNT(DISTINCT CASE WHEN pf.confirmed = 1 THEN pf.round_id END) as confirmed_rounds,
      COUNT(DISTINCT pf.round_id) as total_rounds
    FROM player_fines pf
    INNER JOIN fine_types ft ON pf.fine_type_id = ft.id
    WHERE pf.player_id = ?
  `, [playerId]);

  if (!result.length || result[0].values.length === 0) {
    return {
      total_fines: 0,
      paid_fines: 0,
      outstanding_fines: 0,
      confirmed_rounds: 0,
      total_rounds_with_fines: 0
    };
  }

  const row = result[0].values[0];
  return {
    total_fines: (row[0] as number) || 0,
    paid_fines: (row[1] as number) || 0,
    outstanding_fines: (row[2] as number) || 0,
    confirmed_rounds: (row[3] as number) || 0,
    total_rounds_with_fines: (row[4] as number) || 0
  };
}

export function getPlayerBuyInStatus(playerId: string, seasonId: number): { isPaid: boolean; date: string | null } {
  if (!db) {
    console.warn('Database not initialized in getPlayerBuyInStatus');
    return { isPaid: false, date: null };
  }

  const result = db.exec(`
    SELECT buy_in_paid, buy_in_date
    FROM season_players
    WHERE season_id = ? AND player_id = ?
  `, [seasonId, playerId]);

  if (result.length === 0 || result[0].values.length === 0) {
    return { isPaid: false, date: null };
  }

  const row = result[0].values[0];
  return {
    isPaid: row[0] === 1,
    date: row[1] as string | null
  };
}

export function markBuyInPaid(playerId: string, seasonId: number, paid: boolean): void {
  if (!db) {
    console.warn('Database not initialized in markBuyInPaid');
    return;
  }

  const date = paid ? new Date().toISOString().split('T')[0] : null;

  db.run(`
    INSERT OR REPLACE INTO season_players (season_id, player_id, buy_in_paid, buy_in_date)
    VALUES (?, ?, ?, ?)
  `, [seasonId, playerId, paid ? 1 : 0, date]);

  saveDatabase();
}

export function resetDatabase(): void {
  localStorage.removeItem('gpga_sqlite_db');
  if (db) db.close();
  db = null;
  window.location.reload();
}

export function getCurrentUserId(): string {
  return localStorage.getItem('gpga_current_user') || '1';
}

export function setCurrentUserId(id: string): void {
  localStorage.setItem('gpga_current_user', id);
}

// Authentication functions
export function authenticateUser(email: string, password: string): AuthUser | null {
  if (!db) {
    console.error('Database not initialized');
    return null;
  }

  try {
    // Debug: Check what's in the database
    const allUsers = db.exec('SELECT id, name, email, password, role, status FROM players');
    console.log('All users in database:', allUsers);
    console.log('Attempting login with:', { email, password });

    const result = db.exec(`
      SELECT id, name, email, role, status
      FROM players
      WHERE email = ? AND password = ? AND status = 'active'
    `, [email, password]);

    console.log('Query result:', result);

    if (result.length > 0 && result[0].values.length > 0) {
      const user = result[0].values[0];
      return {
        id: user[0] as string,
        name: user[1] as string,
        email: user[2] as string,
        role: user[3] as 'admin' | 'player',
        status: user[4] as 'active' | 'inactive'
      };
    }
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('gpga_authenticated') === 'true';
}

export function setAuthenticated(value: boolean): void {
  localStorage.setItem('gpga_authenticated', value.toString());
}

export function logout(): void {
  localStorage.removeItem('gpga_authenticated');
  localStorage.removeItem('gpga_current_user');
}
