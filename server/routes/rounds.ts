import { Router } from 'express';
import { getClient } from '../db.js';
import { notify, getSeasonPlayerIds } from '../notify.js';
import { requireAdmin } from '../auth-middleware.js';

const router = Router();

router.get('/', async (req, res) => {
  const seasonId = req.query.season_id;
  const result = seasonId
    ? await getClient().execute({ sql: 'SELECT * FROM rounds WHERE season_id = ? ORDER BY date', args: [Number(seasonId)] })
    : await getClient().execute('SELECT * FROM rounds ORDER BY date');
  res.json(result.rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { season_id, name, date, course_id, course_name, tee_time, tee_time_2 } = req.body;
  const result = await getClient().execute({
    sql: 'INSERT INTO rounds (season_id, name, date, course_id, course_name, tee_time, tee_time_2) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [season_id, name, date, course_id, course_name, tee_time || null, tee_time_2 || null]
  });
  const roundId = Number(result.lastInsertRowid);
  const tees = [tee_time, tee_time_2].filter(Boolean).join(' & ');
  const playerIds = await getSeasonPlayerIds(season_id);
  notify({ playerIds, type: 'round_added', roundId, title: `New Round: ${name}`, body: `${course_name} on ${date}${tees ? `. Tee times: ${tees}` : ''}`, email: true, push: true }).catch(() => {});
  res.status(201).json({ id: roundId });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (['name', 'date', 'course_id', 'course_name', 'tee_time', 'tee_time_2'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  const roundId = Number(id);

  // Get current round before update to detect changes
  const before = await getClient().execute({ sql: 'SELECT * FROM rounds WHERE id = ?', args: [roundId] });
  const old = before.rows[0];

  values.push(roundId);
  await getClient().execute({
    sql: `UPDATE rounds SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: values
  });

  // Notify if date, course, or tee times changed
  if (old) {
    const b = req.body;
    const dateChanged = b.date && b.date !== old.date;
    const courseChanged = b.course_name && b.course_name !== old.course_name;
    const teeChanged = (b.tee_time !== undefined && b.tee_time !== old.tee_time) || (b.tee_time_2 !== undefined && b.tee_time_2 !== old.tee_time_2);

    if (dateChanged || courseChanged || teeChanged) {
      const changes = [dateChanged && 'date', courseChanged && 'course', teeChanged && 'tee times'].filter(Boolean).join(', ');
      const updated = { ...old, ...b };
      const tees = [updated.tee_time, updated.tee_time_2].filter(Boolean).join(' & ');
      const seasonId = Number(old.season_id);
      const playerIds = await getSeasonPlayerIds(seasonId);
      notify({
        playerIds, type: 'round_updated', roundId,
        title: `${old.name} Updated`,
        body: `${changes.charAt(0).toUpperCase() + changes.slice(1)} changed — ${updated.course_name} on ${updated.date}${tees ? `. Tee times: ${tees}` : ''}`,
        email: true, push: true,
      }).catch(() => {});
    }
  }

  res.json({ ok: true });
});

router.put('/:id/close', requireAdmin, async (req, res) => {
  const roundId = Number(req.params.id);
  const db = getClient();

  // Get round info
  const roundResult = await db.execute({ sql: 'SELECT * FROM rounds WHERE id = ?', args: [roundId] });
  const round = roundResult.rows[0];
  if (!round) return res.status(404).json({ error: 'Round not found' });
  if (round.closed) return res.status(400).json({ error: 'Round already closed' });

  // Mark as closed
  await db.execute({ sql: 'UPDATE rounds SET closed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [roundId] });

  // Get scores for this round
  const scoresResult = await db.execute({
    sql: `SELECT s.player_id, p.name, s.strokes, s.handicap, s.stableford
          FROM scores s JOIN players p ON s.player_id = p.id
          WHERE s.round_id = ? AND s.strokes > 0 ORDER BY s.strokes ASC`,
    args: [roundId],
  });

  // Get fines summary for this round
  const finesResult = await db.execute({
    sql: `SELECT SUM(
            CASE
              WHEN ft.tier_threshold > 0 AND pf.quantity > ft.tier_threshold
                THEN (ft.tier_threshold * ft.amount) + ((pf.quantity - ft.tier_threshold) * ft.tier_amount)
              ELSE pf.quantity * ft.amount
            END
          ) as total_fines, COUNT(DISTINCT pf.player_id) as players_fined
          FROM player_fines pf JOIN fine_types ft ON pf.fine_type_id = ft.id
          WHERE pf.round_id = ?`,
    args: [roundId],
  });

  // Build results summary
  const scores = scoresResult.rows;
  const medalWinner = scores[0]; // lowest net strokes
  const sfWinner = [...scores].sort((a, b) => (Number(b.stableford) || 0) - (Number(a.stableford) || 0))[0];
  const totalFines = Number(finesResult.rows[0]?.total_fines) || 0;

  let body = `${round.course_name} — ${scores.length} players\n`;
  if (medalWinner) body += `Medal: ${medalWinner.name} (${medalWinner.strokes} net)\n`;
  if (sfWinner && Number(sfWinner.stableford) > 0) body += `Stableford: ${sfWinner.name} (${sfWinner.stableford} pts)\n`;
  if (totalFines > 0) body += `Fines: R${totalFines.toLocaleString()}`;

  // Notify all season players
  const seasonId = Number(round.season_id);
  const playerIds = await getSeasonPlayerIds(seasonId);
  await notify({
    playerIds, type: 'round_closed', roundId,
    title: `Results: ${round.name}`,
    body: body.trim(),
    email: true, push: true,
  });

  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM rounds WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

export default router;
