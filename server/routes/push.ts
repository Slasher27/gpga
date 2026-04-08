import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.post('/subscribe', async (req, res) => {
  const { player_id, subscription } = req.body;
  if (!player_id || !subscription) return res.status(400).json({ error: 'player_id and subscription required' });
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO push_subscriptions (player_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
    args: [player_id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
  });
  res.json({ ok: true });
});

router.delete('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  await getClient().execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [endpoint] });
  res.json({ ok: true });
});

export default router;
