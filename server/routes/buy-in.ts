import { Router } from 'express';
import { getClient } from '../db.js';

const router = Router();

// Get all players enrolled in a season
router.get('/season/:seasonId', async (req, res) => {
  const result = await getClient().execute({
    sql: `SELECT sp.player_id, sp.buy_in_paid, sp.buy_in_date, p.name, p.email
          FROM season_players sp
          INNER JOIN players p ON sp.player_id = p.id
          WHERE sp.season_id = ? ORDER BY p.name`,
    args: [Number(req.params.seasonId)]
  });
  res.json(result.rows.map(r => ({ ...r, buy_in_paid: Number(r.buy_in_paid) === 1 })));
});

// Add player to season
router.post('/season/:seasonId/player', async (req, res) => {
  const { player_id } = req.body;
  await getClient().execute({
    sql: 'INSERT OR IGNORE INTO season_players (season_id, player_id) VALUES (?, ?)',
    args: [Number(req.params.seasonId), player_id]
  });
  res.json({ ok: true });
});

// Remove player from season
router.delete('/season/:seasonId/player/:playerId', async (req, res) => {
  await getClient().execute({
    sql: 'DELETE FROM season_players WHERE season_id = ? AND player_id = ?',
    args: [Number(req.params.seasonId), req.params.playerId]
  });
  res.json({ ok: true });
});

router.get('/:playerId/:seasonId', async (req, res) => {
  const { playerId, seasonId } = req.params;
  const result = await getClient().execute({
    sql: 'SELECT buy_in_paid, buy_in_date FROM season_players WHERE season_id = ? AND player_id = ?',
    args: [Number(seasonId), playerId]
  });

  if (result.rows.length === 0) return res.json({ isPaid: false, date: null });

  const row = result.rows[0];
  res.json({ isPaid: Number(row.buy_in_paid) === 1, date: row.buy_in_date || null });
});

router.put('/', async (req, res) => {
  const { player_id, season_id, paid } = req.body;
  const date = paid ? new Date().toISOString().split('T')[0] : null;

  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO season_players (season_id, player_id, buy_in_paid, buy_in_date) VALUES (?, ?, ?, ?)',
    args: [season_id, player_id, paid ? 1 : 0, date]
  });
  res.json({ ok: true });
});

export default router;
