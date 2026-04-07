import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM players ORDER BY name');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { id, name, email, password, role, status, avatar } = req.body;
  await getClient().execute({
    sql: 'INSERT INTO players (id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, name, email, password || 'password', role, status, avatar]
  });
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (['name', 'email', 'password', 'role', 'status', 'avatar'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  values.push(id);
  await getClient().execute({
    sql: `UPDATE players SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: values
  });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM players WHERE id = ?', args: [req.params.id] });
  res.json({ ok: true });
});

export default router;
