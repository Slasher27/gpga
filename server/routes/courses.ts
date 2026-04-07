import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT * FROM golf_courses ORDER BY location, name');
  res.json(result.rows);
});

router.get('/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  const result = await getClient().execute({
    sql: 'SELECT * FROM golf_courses WHERE name LIKE ? OR location LIKE ? ORDER BY location, name',
    args: [`%${q}%`, `%${q}%`]
  });
  res.json(result.rows);
});

export default router;
