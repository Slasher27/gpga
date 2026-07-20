import { Router } from 'express';
import { getClient } from '../db.js';
import { notify } from '../notify.js';
import { requireAdmin } from '../auth-middleware.js';

// Tiered fine total: first N units at base amount, remainder at tier_amount.
// When tier_threshold = 0, it's a flat fine (quantity * amount).
// Single server-side source (also used by rounds close + overdue reminders);
// mirrored client-side by calcFineTotal in src/hooks/useFines.ts — keep in sync.
export const FINE_TOTAL_SQL = `(
  CASE
    WHEN ft.tier_threshold > 0 AND pf.quantity > ft.tier_threshold
      THEN (ft.tier_threshold * ft.amount) + ((pf.quantity - ft.tier_threshold) * ft.tier_amount)
    ELSE pf.quantity * ft.amount
  END
)`;

const router = Router();

// ---- Fine Types ----

router.get('/types', async (req, res) => {
  const seasonId = req.query.season_id;
  if (!seasonId) return res.status(400).json({ error: 'season_id required' });

  const result = await getClient().execute({
    sql: 'SELECT * FROM fine_types WHERE season_id = ? ORDER BY sort_order, name',
    args: [Number(seasonId)]
  });
  res.json(result.rows);
});

router.post('/types', requireAdmin, async (req, res) => {
  const { season_id, name, amount, description, sort_order, is_open, tier_threshold, tier_amount } = req.body;
  const result = await getClient().execute({
    sql: 'INSERT INTO fine_types (season_id, name, amount, description, sort_order, is_open, tier_threshold, tier_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [season_id, name, amount, description || '', sort_order || 0, is_open ? 1 : 0, tier_threshold || 0, tier_amount || 0]
  });
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

router.put('/types/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(req.body)) {
    if (['name', 'amount', 'description', 'sort_order', 'tier_threshold', 'tier_amount'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });

  values.push(Number(id));
  await getClient().execute({
    sql: `UPDATE fine_types SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  });
  res.json({ ok: true });
});

router.delete('/types/:id', requireAdmin, async (req, res) => {
  await getClient().execute({ sql: 'DELETE FROM fine_types WHERE id = ?', args: [Number(req.params.id)] });
  res.json({ ok: true });
});

// ---- Player Fines ----

router.get('/player/:playerId/round/:roundId', async (req, res) => {
  const { playerId, roundId } = req.params;
  const result = await getClient().execute({
    sql: `SELECT pf.id, pf.fine_type_id, ft.name, ft.amount, ft.tier_threshold, ft.tier_amount, pf.quantity, pf.paid
          FROM player_fines pf JOIN fine_types ft ON pf.fine_type_id = ft.id
          WHERE pf.player_id = ? AND pf.round_id = ?`,
    args: [playerId, Number(roundId)]
  });

  res.json(result.rows.map(row => ({
    ...row,
    id: Number(row.id),
    fine_type_id: Number(row.fine_type_id),
    amount: Number(row.amount),
    tier_threshold: Number(row.tier_threshold) || 0,
    tier_amount: Number(row.tier_amount) || 0,
    quantity: Number(row.quantity),
    paid: Number(row.paid),
    player_id: playerId,
    round_id: Number(roundId)
  })));
});

router.get('/round/:roundId', async (req, res) => {
  const result = await getClient().execute({
    sql: `SELECT pf.id, pf.player_id, pf.round_id, pf.fine_type_id, pf.quantity,
            pf.paid, pf.paid_date, pf.confirmed, pf.confirmed_date, pf.created_at,
            ft.name, ft.amount, ft.tier_threshold, ft.tier_amount, p.name as player_name
          FROM player_fines pf
          JOIN fine_types ft ON pf.fine_type_id = ft.id
          JOIN players p ON pf.player_id = p.id
          WHERE pf.round_id = ?
          ORDER BY p.name, ft.name`,
    args: [Number(req.params.roundId)]
  });
  res.json(result.rows);
});

router.get('/by-round', async (_req, res) => {
  const result = await getClient().execute(
    `SELECT pf.player_id, pf.round_id, SUM(${FINE_TOTAL_SQL}) as total_fines
     FROM player_fines pf JOIN fine_types ft ON pf.fine_type_id = ft.id
     GROUP BY pf.player_id, pf.round_id`
  );

  const fines: Record<string, Record<number, number>> = {};
  for (const row of result.rows) {
    const pid = row.player_id as string;
    const rid = Number(row.round_id);
    if (!fines[pid]) fines[pid] = {};
    fines[pid][rid] = Number(row.total_fines) || 0;
  }
  res.json(fines);
});

router.put('/set', requireAdmin, async (req, res) => {
  const { player_id, round_id, fine_type_id } = req.body;
  const quantity = Number(req.body.quantity);
  // A non-numeric quantity would either 500 or be stored as a string and
  // poison every SUM(quantity * amount) fine total.
  if (!player_id || !round_id || !fine_type_id || !Number.isFinite(quantity)) {
    return res.status(400).json({ error: 'player_id, round_id, fine_type_id and numeric quantity required' });
  }
  const db = getClient();

  if (quantity <= 0) {
    await db.execute({
      sql: 'DELETE FROM player_fines WHERE player_id = ? AND round_id = ? AND fine_type_id = ?',
      args: [player_id, round_id, fine_type_id]
    });
  } else {
    // Single upsert — the old SELECT-then-INSERT raced concurrent sets into
    // UNIQUE violations, and cost extra Turso round trips per fine tap.
    await db.execute({
      sql: `INSERT INTO player_fines (player_id, round_id, fine_type_id, quantity) VALUES (?, ?, ?, ?)
            ON CONFLICT(player_id, round_id, fine_type_id) DO UPDATE SET quantity = excluded.quantity`,
      args: [player_id, round_id, fine_type_id, quantity]
    });
  }
  res.json({ ok: true });
});

router.put('/pay-round', requireAdmin, async (req, res) => {
  const { player_id, round_id, paid } = req.body;
  const paidDate = paid ? new Date().toISOString().split('T')[0] : null;

  const db = getClient();
  await db.execute({
    sql: 'UPDATE player_fines SET paid = ?, paid_date = ? WHERE player_id = ? AND round_id = ?',
    args: [paid ? 1 : 0, paidDate, player_id, round_id]
  });
  if (paid) {
    const total = await db.execute({ sql: `SELECT SUM(${FINE_TOTAL_SQL}) as amt FROM player_fines pf INNER JOIN fine_types ft ON pf.fine_type_id = ft.id WHERE pf.player_id = ? AND pf.round_id = ?`, args: [player_id, round_id] });
    const round = await db.execute({ sql: 'SELECT name FROM rounds WHERE id = ?', args: [round_id] });
    const amt = Number(total.rows[0]?.amt) || 0;
    const roundName = (round.rows[0]?.name as string) || 'Round';
    await notify({ playerIds: [player_id], type: 'fine_paid', roundId: round_id, title: 'Fine payment confirmed', body: `R${amt.toLocaleString()} for ${roundName} marked as paid`, email: true, push: true }).catch(() => {});
  }
  res.json({ ok: true });
});

router.put('/confirm', requireAdmin, async (req, res) => {
  const { player_id, round_id, confirmed } = req.body;
  const confirmedDate = confirmed ? new Date().toISOString().split('T')[0] : null;

  const db = getClient();
  await db.execute({
    sql: 'UPDATE player_fines SET confirmed = ?, confirmed_date = ? WHERE player_id = ? AND round_id = ?',
    args: [confirmed ? 1 : 0, confirmedDate, player_id, round_id]
  });
  if (confirmed) {
    const fines = await db.execute({ sql: `SELECT COUNT(*) as cnt, SUM(${FINE_TOTAL_SQL}) as amt FROM player_fines pf INNER JOIN fine_types ft ON pf.fine_type_id = ft.id WHERE pf.player_id = ? AND pf.round_id = ? AND pf.quantity > 0`, args: [player_id, round_id] });
    const round = await db.execute({ sql: 'SELECT name FROM rounds WHERE id = ?', args: [round_id] });
    const cnt = Number(fines.rows[0]?.cnt) || 0;
    const amt = Number(fines.rows[0]?.amt) || 0;
    const roundName = (round.rows[0]?.name as string) || 'Round';
    await notify({ playerIds: [player_id], type: 'fines_closed', roundId: round_id, title: `Fines confirmed: ${roundName}`, body: `${cnt} fines totalling R${amt.toLocaleString()}`, email: true, push: true }).catch(() => {});
  }
  res.json({ ok: true });
});

router.get('/confirmed/:playerId/:roundId', async (req, res) => {
  const result = await getClient().execute({
    sql: 'SELECT confirmed FROM player_fines WHERE player_id = ? AND round_id = ? LIMIT 1',
    args: [req.params.playerId, Number(req.params.roundId)]
  });
  res.json({ confirmed: result.rows.length > 0 && Number(result.rows[0].confirmed) === 1 });
});

router.get('/payment-summary', async (req, res) => {
  const seasonId = req.query.season_id;
  const result = await getClient().execute({
    sql: seasonId
      ? `SELECT p.id as player_id, p.name as player_name,
           COALESCE(SUM(${FINE_TOTAL_SQL}), 0) as total_fines,
           COALESCE(SUM(CASE WHEN pf.paid = 1 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as paid_fines,
           COALESCE(SUM(CASE WHEN pf.paid = 0 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as unpaid_fines
         FROM players p
         LEFT JOIN (
           SELECT pf.* FROM player_fines pf
           INNER JOIN rounds r ON pf.round_id = r.id AND r.season_id = ?
         ) pf ON p.id = pf.player_id
         LEFT JOIN fine_types ft ON pf.fine_type_id = ft.id
         GROUP BY p.id, p.name ORDER BY total_fines DESC`
      : `SELECT p.id as player_id, p.name as player_name,
           COALESCE(SUM(${FINE_TOTAL_SQL}), 0) as total_fines,
           COALESCE(SUM(CASE WHEN pf.paid = 1 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as paid_fines,
           COALESCE(SUM(CASE WHEN pf.paid = 0 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as unpaid_fines
         FROM players p
         LEFT JOIN player_fines pf ON p.id = pf.player_id
         LEFT JOIN fine_types ft ON pf.fine_type_id = ft.id
         GROUP BY p.id, p.name ORDER BY total_fines DESC`,
    args: seasonId ? [Number(seasonId)] : []
  });

  res.json(result.rows.map(row => ({
    ...row,
    total_fines: Number(row.total_fines),
    paid_fines: Number(row.paid_fines),
    unpaid_fines: Number(row.unpaid_fines),
    payment_percentage: Number(row.total_fines) > 0
      ? Math.round((Number(row.paid_fines) / Number(row.total_fines)) * 100) : 100
  })));
});

router.get('/player/:playerId/rounds', async (req, res) => {
  const seasonId = req.query.season_id;
  const result = await getClient().execute({
    sql: `SELECT r.id as round_id, r.name as round_name, r.date as round_date,
            SUM(${FINE_TOTAL_SQL}) as total_amount,
            MIN(pf.paid) as all_paid, MIN(pf.confirmed) as all_confirmed
          FROM rounds r
          INNER JOIN player_fines pf ON r.id = pf.round_id
          INNER JOIN fine_types ft ON pf.fine_type_id = ft.id
          WHERE pf.player_id = ? ${seasonId ? 'AND r.season_id = ?' : ''}
          GROUP BY r.id, r.name, r.date ORDER BY r.date DESC`,
    args: seasonId ? [req.params.playerId, Number(seasonId)] : [req.params.playerId]
  });

  res.json(result.rows.map(row => ({
    ...row,
    round_id: Number(row.round_id),
    total_amount: Number(row.total_amount),
    paid: Number(row.all_paid) === 1,
    confirmed: Number(row.all_confirmed) === 1
  })));
});

router.get('/player/:playerId/summary', async (req, res) => {
  const seasonId = req.query.season_id;
  const result = await getClient().execute({
    sql: `SELECT
            COALESCE(SUM(${FINE_TOTAL_SQL}), 0) as total_fines,
            COALESCE(SUM(CASE WHEN pf.paid = 1 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as paid_fines,
            COALESCE(SUM(CASE WHEN pf.paid = 0 THEN ${FINE_TOTAL_SQL} ELSE 0 END), 0) as outstanding_fines,
            COUNT(DISTINCT CASE WHEN pf.confirmed = 1 THEN pf.round_id END) as confirmed_rounds,
            COUNT(DISTINCT pf.round_id) as total_rounds_with_fines
          FROM player_fines pf
          INNER JOIN fine_types ft ON pf.fine_type_id = ft.id
          ${seasonId ? 'INNER JOIN rounds r ON pf.round_id = r.id AND r.season_id = ?' : ''}
          WHERE pf.player_id = ?`,
    args: seasonId ? [Number(seasonId), req.params.playerId] : [req.params.playerId]
  });

  const row = result.rows[0];
  res.json({
    total_fines: Number(row?.total_fines) || 0,
    paid_fines: Number(row?.paid_fines) || 0,
    outstanding_fines: Number(row?.outstanding_fines) || 0,
    confirmed_rounds: Number(row?.confirmed_rounds) || 0,
    total_rounds_with_fines: Number(row?.total_rounds_with_fines) || 0
  });
});

export default router;
