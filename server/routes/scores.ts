import { Router } from 'express';
import { getClient } from '../db.js';

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

router.put('/', async (req, res) => {
  const { player_id, round_id, strokes, handicap, stableford } = req.body;
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO scores (player_id, round_id, strokes, handicap, stableford) VALUES (?, ?, ?, ?, ?)',
    args: [player_id, round_id, strokes, handicap || 0, stableford || 0]
  });
  res.json({ ok: true });
});

export default router;
