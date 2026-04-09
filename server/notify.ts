import { getClient } from './db.js';
// @ts-ignore -- no type declarations available
import webpush from 'web-push';
import { Resend } from 'resend';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@gpga.vercel.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface NotifyOptions {
  playerIds: string[];
  type: string;
  title: string;
  body: string;
  roundId?: number;
  email?: boolean;
  push?: boolean;
}

export async function notify({ playerIds, type, title, body, roundId, email = false, push = false }: NotifyOptions) {
  const db = getClient();

  // 1. In-app: bulk insert notifications
  if (playerIds.length > 0) {
    const placeholders = playerIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const args = playerIds.flatMap(pid => [pid, type, title, body, roundId || null]);
    await db.execute({ sql: `INSERT INTO notifications (player_id, type, title, body, round_id) VALUES ${placeholders}`, args });
  }

  // 2. Email via Resend
  if (email && resend && playerIds.length > 0) {
    const players = await db.execute('SELECT id, email, name FROM players WHERE status = \'active\'');
    const recipients = players.rows.filter(p => playerIds.includes(p.id as string));
    for (const player of recipients) {
      try {
        await resend.emails.send({
          from: 'GPGA <noreply@gpga.vercel.app>',
          to: player.email as string,
          subject: title,
          text: `Hi ${player.name},\n\n${body}\n\n— GPGA Score Manager`,
        });
      } catch {}
    }
  }

  // 3. Browser push
  if (push && playerIds.length > 0) {
    const subs = await db.execute({
      sql: `SELECT * FROM push_subscriptions WHERE player_id IN (${playerIds.map(() => '?').join(',')})`,
      args: playerIds,
    });
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          JSON.stringify({ title, body })
        );
      } catch (err: any) {
        // Remove invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE id = ?', args: [sub.id] });
        }
      }
    }
  }
}

// Helper: get all active season player IDs
export async function getSeasonPlayerIds(seasonId: number): Promise<string[]> {
  const result = await getClient().execute({
    sql: 'SELECT player_id FROM season_players WHERE season_id = ?',
    args: [seasonId],
  });
  return result.rows.map(r => r.player_id as string);
}
