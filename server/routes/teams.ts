import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

// GET /api/teams?season_id=1
router.get('/', async (req, res) => {
  const seasonId = req.query.season_id;
  if (!seasonId) return res.status(400).json({ error: 'season_id required' });

  const result = await getClient().execute({
    sql: `SELECT t.id, t.season_id, t.name, t.player1_id, t.player2_id,
            p1.name as player1_name, p2.name as player2_name
          FROM teams t
          JOIN players p1 ON t.player1_id = p1.id
          JOIN players p2 ON t.player2_id = p2.id
          WHERE t.season_id = ?
          ORDER BY t.name`,
    args: [Number(seasonId)]
  });

  res.json(result.rows);
});

// POST /api/teams
router.post('/', async (req, res) => {
  const { season_id, name, player1_id, player2_id } = req.body;
  const result = await getClient().execute({
    sql: 'INSERT INTO teams (season_id, name, player1_id, player2_id) VALUES (?, ?, ?, ?)',
    args: [season_id, name, player1_id, player2_id]
  });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// PUT /api/teams/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (['name', 'player1_id', 'player2_id'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  values.push(Number(id));
  await getClient().execute({
    sql: `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  });
  res.json({ ok: true });
});

// DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM teams WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

export default router;
