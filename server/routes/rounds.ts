import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const seasonId = req.query.season_id;
  const result = seasonId
    ? await getClient().execute({ sql: 'SELECT * FROM rounds WHERE season_id = ? ORDER BY date', args: [Number(seasonId)] })
    : await getClient().execute('SELECT * FROM rounds ORDER BY date');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { season_id, name, date, course_id, course_name } = req.body;
  const result = await getClient().execute({
    sql: 'INSERT INTO rounds (season_id, name, date, course_id, course_name) VALUES (?, ?, ?, ?, ?)',
    args: [season_id, name, date, course_id, course_name]
  });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (['name', 'date', 'course_id', 'course_name'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  values.push(Number(id));
  await getClient().execute({
    sql: `UPDATE rounds SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: values
  });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM rounds WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

export default router;
