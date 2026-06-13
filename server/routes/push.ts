import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

router.post('/subscribe', async (req, res) => {
  // Owner comes from the verified JWT, never the body — otherwise a member could
  // register a subscription under another player's id and receive their pushes.
  const player_id = req.auth?.sub;
  const { subscription } = req.body;
  if (!player_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!subscription) return res.status(400).json({ error: 'subscription required' });
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
