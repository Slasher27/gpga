import { Router } from 'express';
import { getClient } from '../db.js';
import { requireMaster, hashPassword } from '../auth-middleware.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT id, name, email, role, status, avatar, notify_email, notify_push, created_at, updated_at FROM players ORDER BY name');
  res.json(result.rows);
});

router.post('/', requireMaster, async (req, res) => {
  const { id, name, email, password, role, status, avatar } = req.body;
  const hashed = await hashPassword(password || 'password');
  await getClient().execute({
    sql: 'INSERT INTO players (id, name, email, password, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, name, email, hashed, role, status, avatar]
  });
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Self-edit or master can edit anyone
  const caller = req.auth;
  const isSelf = caller?.sub === id;
  const isMaster = caller?.role === 'master';
  if (!isSelf && !isMaster) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Only master can change role or status
  const selfEditable = ['name', 'email', 'password', 'avatar', 'notify_email', 'notify_push'];
  const masterOnly = ['role', 'status'];
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (selfEditable.includes(key) || (isMaster && masterOnly.includes(key))) {
      if (key === 'password') {
        fields.push('password = ?');
        values.push(await hashPassword(String(val)));
      } else {
        fields.push(`${key} = ?`);
        values.push(val);
      }
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

router.delete('/:id', requireMaster, async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM players WHERE id = ?', args: [req.params.id] });
  res.json({ ok: true });
});

export default router;
