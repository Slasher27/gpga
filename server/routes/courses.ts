import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT * FROM golf_courses ORDER BY location, name');
  res.json(result.rows);
});

export default router;
