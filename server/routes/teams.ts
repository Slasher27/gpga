import { Router } from 'express';
import { getClient } from '../db.js';
import { requireAdmin } from '../auth-middleware.js';

const router = Router();

// GET /api/teams?season_id=1
router.get('/', async (req, res) => {
  const seasonId = req.query.season_id;
  if (!seasonId) return res.status(400).json({ error: 'season_id required' });

  const result = await getClient().execute({
    sql: `SELECT t.id, t.season_id, t.name, t.player1_id, t.player2_id,
            p1.name as player1_name, p2.name as player2_name
          FROM teams t
          JOIN players p1 ON t.player1_id = p1.id
          JOIN players p2 ON t.player2_id = p2.id
          WHERE t.season_id = ?
          ORDER BY t.name`,
    args: [Number(seasonId)]
  });

  res.json(result.rows);
});

// The schema's per-column UNIQUEs don't stop a player being player1 of one
// team and player2 of another, or a self-pair — check both here.
async function pairingConflict(seasonId: number, p1: string, p2: string, excludeTeamId?: number): Promise<string | null> {
  if (p1 === p2) return 'A player cannot be paired with themselves';
  const clash = await getClient().execute({
    sql: `SELECT id FROM teams WHERE season_id = ? AND id != ?
          AND (player1_id IN (?, ?) OR player2_id IN (?, ?))`,
    args: [seasonId, excludeTeamId ?? -1, p1, p2, p1, p2]
  });
  return clash.rows.length > 0 ? 'A player is already in a team this season' : null;
}

// POST /api/teams
router.post('/', requireAdmin, async (req, res) => {
  const { season_id, name, player1_id, player2_id } = req.body;
  if (!season_id || !name || !player1_id || !player2_id) {
    return res.status(400).json({ error: 'season_id, name and both players required' });
  }
  const conflict = await pairingConflict(Number(season_id), player1_id, player2_id);
  if (conflict) return res.status(409).json({ error: conflict });
  const result = await getClient().execute({
    sql: 'INSERT INTO teams (season_id, name, player1_id, player2_id) VALUES (?, ?, ?, ?)',
    args: [season_id, name, player1_id, player2_id]
  });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// PUT /api/teams/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (['name', 'player1_id', 'player2_id'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  const teamId = Number(id);
  if ('player1_id' in req.body || 'player2_id' in req.body) {
    const cur = await getClient().execute({ sql: 'SELECT season_id, player1_id, player2_id FROM teams WHERE id = ?', args: [teamId] });
    const row = cur.rows[0];
    if (!row) return res.status(404).json({ error: 'Team not found' });
    const p1 = String(req.body.player1_id ?? row.player1_id);
    const p2 = String(req.body.player2_id ?? row.player2_id);
    const conflict = await pairingConflict(Number(row.season_id), p1, p2, teamId);
    if (conflict) return res.status(409).json({ error: conflict });
  }

  values.push(teamId);
  await getClient().execute({
    sql: `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  });
  res.json({ ok: true });
});

// DELETE /api/teams/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM teams WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

export default router;
