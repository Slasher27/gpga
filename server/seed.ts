import { getClient } from './db.js';

export async function seedDatabase(): Promise<void> {
  const db = getClient();

  const count = await db.execute('SELECT COUNT(*) as c FROM players');
  if (Number(count.rows[0].c) > 0) return;

  console.log('Seeding database...');

  await db.batch([
    {
      sql: `INSERT OR IGNORE INTO players (id, name, email, password, role, status, avatar) VALUES
        ('1', 'Wayne Windt', 'wayne@gpga.com', 'password', 'player', 'active', NULL),
        ('2', 'Ryan Ambrose', 'ryan.a@gpga.com', 'password', 'player', 'active', NULL),
        ('3', 'Duwayne Cowney', 'duwayne@gpga.com', 'password', 'master', 'active', NULL),
        ('4', 'Ryan Strauss', 'ryan.s@gpga.com', 'password', 'player', 'active', NULL),
        ('5', 'Justin Fish', 'justin@gpga.com', 'password', 'player', 'active', NULL),
        ('6', 'Gareth Williams', 'gareth.w@gpga.com', 'password', 'player', 'active', NULL),
        ('7', 'Gareth Roos', 'gareth.r@gpga.com', 'password', 'player', 'active', NULL),
        ('8', 'Charl Cordier', 'charl@gpga.com', 'password', 'player', 'active', NULL)`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO seasons (id, year, name, buy_in_amount, is_active) VALUES (1, 2025, 'GPGA 2025 Season', 2500, 1)`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO golf_courses (id, name, location, par) VALUES
        (1, 'Royal Cape Golf Club', 'Cape Town', 72),
        (2, 'Rondebosch Golf Club', 'Cape Town', 70),
        (3, 'Mowbray Golf Club', 'Cape Town', 72),
        (4, 'King David Mowbray Golf Club', 'Cape Town', 72),
        (5, 'Westlake Golf Club', 'Cape Town', 72),
        (6, 'Clovelly Country Club', 'Cape Town', 72),
        (7, 'Steenberg Golf Club', 'Cape Town', 72),
        (8, 'Retreat Golf Club', 'Cape Town', 71),
        (9, 'Durbanville Golf Club', 'Cape Town', 72),
        (10, 'Bellville Golf Club', 'Cape Town', 72),
        (11, 'Parow Golf Club', 'Cape Town', 72),
        (12, 'Kuils River Golf Club', 'Cape Town', 72),
        (13, 'Strand Golf Club', 'Cape Town', 72),
        (14, 'Somerset West Golf Club', 'Cape Town', 72),
        (15, 'Milnerton Golf Club', 'Cape Town', 72),
        (16, 'Atlantic Beach Golf Club', 'Cape Town', 72),
        (17, 'Metropolitan Golf Club', 'Cape Town', 72),
        (18, 'Silwerstroom Golf Estate', 'Cape Town', 72),
        (19, 'Fisantekraal Golf Club', 'Cape Town', 72),
        (20, 'Sunrise Golf Club', 'Cape Town', 71),
        (21, 'Rocklands Golf Club', 'Cape Town', 72),
        (22, 'Hermanus Golf Club', 'Hermanus', 72),
        (23, 'Arabella Golf Club', 'Kleinmond', 72),
        (24, 'Stellenbosch Golf Club', 'Stellenbosch', 72),
        (25, 'Erinvale Estate Hotel & Spa', 'Stellenbosch', 72),
        (26, 'De Zalze Golf Club', 'Stellenbosch', 72),
        (27, 'Devonvale Golf & Wine Estate', 'Stellenbosch', 72),
        (28, 'Pearl Valley Golf Estate', 'Paarl', 72),
        (29, 'Boschenmeer Golf Estate', 'Paarl', 72),
        (30, 'Paarl Golf Club', 'Paarl', 72)`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO rounds (id, season_id, name, date, course_id, course_name) VALUES
        (1, 1, 'Round 1', '2025-01-10', 9, 'Durbanville Golf Club'),
        (2, 1, 'Round 2', '2025-02-14', 15, 'Milnerton Golf Club'),
        (3, 1, 'Round 3', '2025-03-10', 6, 'Clovelly Country Club'),
        (4, 1, 'Round 4', '2025-04-12', 30, 'Paarl Golf Club'),
        (5, 1, 'Round 5', '2025-05-15', 25, 'Erinvale Estate Hotel & Spa'),
        (6, 1, 'Round 6', '2025-06-20', 28, 'Pearl Valley Golf Estate')`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO fine_types (id, season_id, name, amount, description) VALUES
        (1, 1, 'Late Arrival', 50, 'Arriving late to tee time'),
        (2, 1, 'Slow Play', 100, 'Holding up the group'),
        (3, 1, 'Lost Ball', 20, 'Per ball lost'),
        (4, 1, 'No Show', 200, 'Missing a round without notice'),
        (5, 1, 'Dress Code Violation', 30, 'Not adhering to dress code')`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO scores (player_id, round_id, strokes) VALUES
        ('1', 1, 77), ('1', 2, 71), ('1', 3, 79), ('1', 4, 77), ('1', 5, 71), ('1', 6, 85),
        ('2', 1, 74), ('2', 2, 77), ('2', 3, 73), ('2', 4, 79), ('2', 5, 79), ('2', 6, 84),
        ('3', 1, 72), ('3', 2, 73), ('3', 3, 81), ('3', 4, 79), ('3', 5, 70), ('3', 6, 80),
        ('4', 1, 76), ('4', 2, 69), ('4', 3, 75), ('4', 4, 80), ('4', 5, 73), ('4', 6, 77),
        ('5', 1, 78), ('5', 2, 76), ('5', 3, 74), ('5', 4, 87), ('5', 5, 80), ('5', 6, 83),
        ('6', 1, 78), ('6', 2, 77), ('6', 3, 88), ('6', 4, 79), ('6', 5, 75), ('6', 6, 79),
        ('7', 1, 77), ('7', 2, 72), ('7', 3, 78), ('7', 4, 77), ('7', 5, 74), ('7', 6, 89),
        ('8', 1, 72)`,
      args: []
    },
    {
      sql: `INSERT OR IGNORE INTO season_players (season_id, player_id, buy_in_paid, buy_in_date) VALUES
        (1, '1', 1, '2025-01-05'),
        (1, '2', 1, '2025-01-06'),
        (1, '3', 1, '2025-01-05'),
        (1, '4', 1, '2025-01-07'),
        (1, '5', 0, NULL),
        (1, '6', 1, '2025-01-08'),
        (1, '7', 1, '2025-01-09'),
        (1, '8', 0, NULL)`,
      args: []
    }
  ], 'write');

  console.log('Database seeded successfully');
}
