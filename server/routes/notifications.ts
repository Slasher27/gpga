import { Router } from 'express';
import { getClient } from '../db.js';
import { notify } from '../notify.js';

const router = Router();

// Get player's notifications
router.get('/', async (req, res) => {
  const playerId = req.query.player_id;
  if (!playerId) return res.status(400).json({ error: 'player_id required' });
  const result = await getClient().execute({
    sql: 'SELECT * FROM notifications WHERE player_id = ? ORDER BY read ASC, created_at DESC LIMIT 50',
    args: [playerId as string],
  });
  res.json(result.rows);
});

// Unread count
router.get('/unread-count', async (req, res) => {
  const playerId = req.query.player_id;
  if (!playerId) return res.status(400).json({ error: 'player_id required' });
  const result = await getClient().execute({
    sql: 'SELECT COUNT(*) as count FROM notifications WHERE player_id = ? AND read = 0',
    args: [playerId as string],
  });
  res.json({ count: Number(result.rows[0]?.count) || 0 });
});

// Mark one as read
router.put('/:id/read', async (req, res) => {
  await getClient().execute({ sql: 'UPDATE notifications SET read = 1 WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  const playerId = req.query.player_id;
  if (!playerId) return res.status(400).json({ error: 'player_id required' });
  await getClient().execute({ sql: 'UPDATE notifications SET read = 1 WHERE player_id = ?', args: [playerId as string] });
  res.json({ ok: true });
});

// Clear all read notifications
router.delete('/clear-read', async (req, res) => {
  const playerId = req.query.player_id;
  if (!playerId) return res.status(400).json({ error: 'player_id required' });
  await getClient().execute({ sql: 'DELETE FROM notifications WHERE player_id = ? AND read = 1', args: [playerId as string] });
  res.json({ ok: true });
});

// Check & generate time-based notifications, return unread count
router.get('/check', async (req, res) => {
  const playerId = req.query.player_id as string;
  const seasonId = req.query.season_id;
  if (!playerId || !seasonId) return res.status(400).json({ error: 'player_id and season_id required' });

  const db = getClient();

  // Auto-delete read notifications older than 30 days
  await db.execute({ sql: "DELETE FROM notifications WHERE player_id = ? AND read = 1 AND created_at < datetime('now', '-30 days')", args: [playerId] });

  const today = new Date().toISOString().split('T')[0];
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Get upcoming rounds for this season
  const rounds = await db.execute({
    sql: 'SELECT * FROM rounds WHERE season_id = ? AND date >= ? ORDER BY date',
    args: [Number(seasonId), today],
  });

  for (const round of rounds.rows) {
    const roundDate = round.date as string;
    const roundId = Number(round.id);
    const courseName = round.course_name as string;
    const roundName = round.name as string;
    const tees = [round.tee_time, round.tee_time_2].filter(Boolean).join(' & ');

    // 7-day reminder
    if (roundDate === in7d) {
      const exists = await db.execute({
        sql: 'SELECT id FROM notifications WHERE player_id = ? AND type = ? AND round_id = ?',
        args: [playerId, 'round_reminder_7d', roundId],
      });
      if (exists.rows.length === 0) {
        await notify({
          playerIds: [playerId], type: 'round_reminder_7d', roundId,
          title: 'Round in 7 days',
          body: `${roundName} at ${courseName} on ${roundDate}`,
          email: true, push: true,
        });
      }
    }

    // 24-hour reminder
    if (roundDate === tomorrow) {
      const exists = await db.execute({
        sql: 'SELECT id FROM notifications WHERE player_id = ? AND type = ? AND round_id = ?',
        args: [playerId, 'round_reminder_24h', roundId],
      });
      if (exists.rows.length === 0) {
        await notify({
          playerIds: [playerId], type: 'round_reminder_24h', roundId,
          title: 'Round tomorrow!',
          body: `${roundName} at ${courseName}${tees ? `. Tee times: ${tees}` : ''}`,
          email: true, push: true,
        });
      }
    }
  }

  // Fine overdue check — next round within 7 days and player has unpaid fines
  const nextRound = rounds.rows[0];
  if (nextRound) {
    const nextDate = new Date(nextRound.date as string);
    const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / 86400000);
    if (daysUntil <= 7 && daysUntil > 0) {
      // Check unpaid fines
      const unpaid = await db.execute({
        sql: `SELECT SUM(pf.quantity * ft.amount) as total FROM player_fines pf
              INNER JOIN fine_types ft ON pf.fine_type_id = ft.id
              INNER JOIN rounds r ON pf.round_id = r.id AND r.season_id = ?
              WHERE pf.player_id = ? AND pf.paid = 0`,
        args: [Number(seasonId), playerId],
      });
      const total = Number(unpaid.rows[0]?.total) || 0;
      if (total > 0) {
        // Check not sent in last 7 days
        const recent = await db.execute({
          sql: "SELECT id FROM notifications WHERE player_id = ? AND type = 'fine_overdue' AND created_at > datetime('now', '-7 days')",
          args: [playerId],
        });
        if (recent.rows.length === 0) {
          await notify({
            playerIds: [playerId], type: 'fine_overdue',
            title: 'Outstanding fines reminder',
            body: `R${total.toLocaleString()} unpaid — next round in ${daysUntil} days`,
            email: true, push: true,
          });
        }
      }
    }
  }

  // Return unread count
  const count = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM notifications WHERE player_id = ? AND read = 0',
    args: [playerId],
  });
  res.json({ count: Number(count.rows[0]?.count) || 0 });
});

export default router;
