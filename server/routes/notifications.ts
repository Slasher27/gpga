import { Router } from 'express';
import { getClient } from '../db.js';
import { notify } from '../notify.js';
import { FINE_TOTAL_SQL } from './fines.js';

const router = Router();

// All notification routes act on the authenticated player only — the player id
// comes from the verified JWT (req.auth.sub set by requireAuth), never from a
// client-supplied param, so one member can't read or alter another's feed.

// Get player's notifications
router.get('/', async (req, res) => {
  const playerId = req.auth?.sub;
  if (!playerId) return res.status(401).json({ error: 'Unauthorized' });
  const result = await getClient().execute({
    sql: 'SELECT * FROM notifications WHERE player_id = ? ORDER BY read ASC, created_at DESC LIMIT 50',
    args: [playerId],
  });
  res.json(result.rows);
});

// Mark one as read (scoped to the owner so an id alone can't touch another feed)
router.put('/:id/read', async (req, res) => {
  const playerId = req.auth?.sub;
  if (!playerId) return res.status(401).json({ error: 'Unauthorized' });
  await getClient().execute({ sql: 'UPDATE notifications SET read = 1 WHERE id = ? AND player_id = ?', args: [Number(req.params.id), playerId] });
  res.json({ ok: true });
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  const playerId = req.auth?.sub;
  if (!playerId) return res.status(401).json({ error: 'Unauthorized' });
  await getClient().execute({ sql: 'UPDATE notifications SET read = 1 WHERE player_id = ?', args: [playerId] });
  res.json({ ok: true });
});

// Clear all read notifications
router.delete('/clear-read', async (req, res) => {
  const playerId = req.auth?.sub;
  if (!playerId) return res.status(401).json({ error: 'Unauthorized' });
  await getClient().execute({ sql: 'DELETE FROM notifications WHERE player_id = ? AND read = 1', args: [playerId] });
  res.json({ ok: true });
});

// Check & generate time-based notifications, return unread count
router.get('/check', async (req, res) => {
  const playerId = req.auth?.sub;
  const seasonId = req.query.season_id;
  if (!playerId) return res.status(401).json({ error: 'Unauthorized' });
  if (!seasonId) return res.status(400).json({ error: 'season_id required' });

  const db = getClient();

  const today = new Date().toISOString().split('T')[0];
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // This endpoint is polled every 2 min by every open client. Every reminder
  // (7-day, 24-hour, fine-overdue) only fires within 7 days of a round, so one
  // bounded query decides whether any of the heavier work below runs at all —
  // outside that window the poll costs just this SELECT plus the count.
  const rounds = await db.execute({
    sql: 'SELECT * FROM rounds WHERE season_id = ? AND date >= ? AND date <= ? ORDER BY date',
    args: [Number(seasonId), today, in7d],
  });

  if (rounds.rows.length > 0) {
    // Auto-delete read notifications older than 30 days
    await db.execute({ sql: "DELETE FROM notifications WHERE player_id = ? AND read = 1 AND created_at < datetime('now', '-30 days')", args: [playerId] });

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
    const daysUntil = Math.ceil((new Date(nextRound.date as string).getTime() - Date.now()) / 86400000);
    if (daysUntil <= 7 && daysUntil > 0) {
      // Check unpaid fines
      const unpaid = await db.execute({
        sql: `SELECT SUM(${FINE_TOTAL_SQL}) as total FROM player_fines pf
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
