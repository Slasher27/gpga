import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await getClient().execute({
    sql: `SELECT id, name, email, role, status FROM players WHERE email = ? AND password = ? AND status = 'active'`,
    args: [email, password]
  });

  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(result.rows[0]);
});

export default router;
