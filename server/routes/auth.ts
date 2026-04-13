import { Router } from 'express';
import { getClient } from '../db.js';
import { verifyPassword, upgradePasswordHash, signToken } from '../auth-middleware.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = await getClient().execute({
    sql: `SELECT id, name, email, role, status, password FROM players WHERE email = ? AND status = 'active'`,
    args: [email]
  });

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const row = result.rows[0] as any;
  const { ok, needsUpgrade } = await verifyPassword(password, String(row.password || ''));
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  if (needsUpgrade) {
    await upgradePasswordHash(String(row.id), password);
  }

  const token = signToken({ sub: String(row.id), role: row.role });
  res.json({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    token
  });
});

export default router;
