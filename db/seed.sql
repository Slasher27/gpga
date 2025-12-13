-- Seed data for GPGA Golf League

-- Insert default players (all with default password: 'password')
-- Duwayne Cowney is the only admin
INSERT OR IGNORE INTO players (id, name, email, password, role, status, avatar) VALUES
('1', 'Wayne Windt', 'wayne@gpga.com', 'password', 'player', 'active', NULL),
('2', 'Ryan Ambrose', 'ryan.a@gpga.com', 'password', 'player', 'active', NULL),
('3', 'Duwayne Cowney', 'duwayne@gpga.com', 'password', 'admin', 'active', NULL),
('4', 'Ryan Strauss', 'ryan.s@gpga.com', 'password', 'player', 'active', NULL),
('5', 'Justin Fish', 'justin@gpga.com', 'password', 'player', 'active', NULL),
('6', 'Gareth Williams', 'gareth.w@gpga.com', 'password', 'player', 'active', NULL),
('7', 'Gareth Roos', 'gareth.r@gpga.com', 'password', 'player', 'active', NULL),
('8', 'Charl Cordier', 'charl@gpga.com', 'password', 'player', 'active', NULL);

-- Insert default rounds
INSERT OR IGNORE INTO rounds (id, name, date, course) VALUES
(1, 'Round 1', '2025-01-10', 'Durbanville'),
(2, 'Round 2', '2025-02-14', 'Milnerton'),
(3, 'Round 3', '2025-03-10', 'Clovelly'),
(4, 'Round 4', '2025-04-12', 'Paarl'),
(5, 'Round 5', '2025-05-15', 'Erinvale'),
(6, 'Round 6', '2025-06-20', 'Pearl Valley');

-- Insert scores for Wayne Windt
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('1', 1, 77, 0), ('1', 2, 71, 0), ('1', 3, 79, 0),
('1', 4, 77, 0), ('1', 5, 71, 0), ('1', 6, 85, 0);

-- Insert scores for Ryan Ambrose
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('2', 1, 74, 50), ('2', 2, 77, 20), ('2', 3, 73, 0),
('2', 4, 79, 100), ('2', 5, 79, 0), ('2', 6, 84, 50);

-- Insert scores for Duwayne Cowney
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('3', 1, 72, 435), ('3', 2, 73, 705), ('3', 3, 81, 1020),
('3', 4, 79, 530), ('3', 5, 70, 430), ('3', 6, 80, 840);

-- Insert scores for Ryan Strauss
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('4', 1, 76, 550), ('4', 2, 69, 1100), ('4', 3, 75, 600),
('4', 4, 80, 745), ('4', 5, 73, 845), ('4', 6, 77, 460);

-- Insert scores for Justin Fish
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('5', 1, 78, 790), ('5', 2, 76, 825), ('5', 3, 74, 720),
('5', 4, 87, 945), ('5', 5, 80, 770), ('5', 6, 83, 995);

-- Insert scores for Gareth Williams
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('6', 1, 78, 965), ('6', 2, 77, 1290), ('6', 3, 88, 1380),
('6', 4, 79, 600), ('6', 5, 75, 510), ('6', 6, 79, 860);

-- Insert scores for Gareth Roos
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('7', 1, 77, 960), ('7', 2, 72, 1220), ('7', 3, 78, 1020),
('7', 4, 77, 1215), ('7', 5, 74, 870), ('7', 6, 89, 930);

-- Insert scores for Charl Cordier
INSERT OR IGNORE INTO scores (player_id, round_id, strokes, fines) VALUES
('8', 1, 72, 0);
