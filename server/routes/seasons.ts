import { Router } from 'express';
import { getClient } from '../db.js';
import { requireAdmin } from '../auth-middleware.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT * FROM seasons ORDER BY year DESC');
  res.json(result.rows);
});

router.get('/active', async (_req, res) => {
  const result = await getClient().execute('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1');
  res.json(result.rows[0] || null);
});

router.post('/', requireAdmin, async (req, res) => {
  const { year, name, buy_in_amount, is_active, medal_1st, medal_2nd, stableford_1st, stableford_2nd, team_1st } = req.body;
  const db = getClient();

  const insert = {
    sql: 'INSERT INTO seasons (year, name, buy_in_amount, medal_1st, medal_2nd, stableford_1st, stableford_2nd, team_1st, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [year, name, buy_in_amount || 0, medal_1st || 0, medal_2nd || 0, stableford_1st || 0, stableford_2nd || 0, team_1st || 0, is_active ? 1 : 0]
  };

  // Deactivate + insert atomically so a mid-way failure can't leave zero active seasons.
  const stmts = is_active ? [{ sql: 'UPDATE seasons SET is_active = 0', args: [] }, insert] : [insert];
  const results = await db.batch(stmts, 'write');

  res.status(201).json({ id: Number(results[results.length - 1].lastInsertRowid) });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const db = getClient();

  const allowed = ['year', 'name', 'buy_in_amount', 'medal_1st', 'medal_2nd', 'stableford_1st', 'stableford_2nd', 'team_1st'];
  const fields: string[] = [];
  const values: any[] = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (req.body.is_active !== undefined) { fields.push('is_active = ?'); values.push(req.body.is_active ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  values.push(Number(id));
  const update = {
    sql: `UPDATE seasons SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: values
  };

  // Deactivate-all + update atomically so activating one can't leave zero active seasons.
  const stmts = req.body.is_active ? [{ sql: 'UPDATE seasons SET is_active = 0', args: [] }, update] : [update];
  await db.batch(stmts, 'write');
  res.json({ ok: true });
});

export default router;
