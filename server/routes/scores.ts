import { Router } from 'express';
import { getClient } from '../db.js';
import { requireAdmin } from '../auth-middleware.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await getClient().execute('SELECT player_id, round_id, strokes, handicap, stableford FROM scores');

  const scores: Record<string, Record<number, { strokes: number; handicap: number; stableford: number }>> = {};
  for (const row of result.rows) {
    const pid = row.player_id as string;
    const rid = Number(row.round_id);
    if (!scores[pid]) scores[pid] = {};
    scores[pid][rid] = {
      strokes: Number(row.strokes),
      handicap: Number(row.handicap) || 0,
      stableford: Number(row.stableford) || 0
    };
  }

  res.json(scores);
});

router.put('/', requireAdmin, async (req, res) => {
  const { player_id, round_id } = req.body;
  const strokes = Number(req.body.strokes);
  const handicap = Number(req.body.handicap) || 0;
  const stableford = Number(req.body.stableford) || 0;
  // Non-numeric strokes would land in the row as-is and flow into every
  // leaderboard SUM and the results email.
  if (!player_id || !round_id || !Number.isFinite(strokes)) {
    return res.status(400).json({ error: 'player_id, round_id and numeric strokes required' });
  }

  const db = getClient();
  // Closing a round locks its scores — enforce it here, not just in the UI,
  // so a stale tab can't rewrite history after results have gone out.
  const round = await db.execute({ sql: 'SELECT closed FROM rounds WHERE id = ?', args: [Number(round_id)] });
  if (!round.rows[0]) return res.status(404).json({ error: 'Round not found' });
  if (Number(round.rows[0].closed)) return res.status(400).json({ error: 'Round is closed — scores are locked' });

  if (strokes <= 0) {
    // Clearing an entry: remove the row entirely so a mistaken score can't
    // keep counting the round as "played" in the drop/teams logic.
    await db.execute({
      sql: 'DELETE FROM scores WHERE player_id = ? AND round_id = ?',
      args: [player_id, Number(round_id)]
    });
  } else {
    await db.execute({
      sql: `INSERT INTO scores (player_id, round_id, strokes, handicap, stableford) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(player_id, round_id) DO UPDATE SET strokes = excluded.strokes, handicap = excluded.handicap, stableford = excluded.stableford`,
      args: [player_id, Number(round_id), strokes, handicap, stableford]
    });
  }
  res.json({ ok: true });
});

export default router;
