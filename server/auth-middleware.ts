import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getClient } from './db.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '30d';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET env var is missing or too short (min 32 chars)');
  }
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

// Verify a password, with lazy migration from legacy plaintext.
// Returns { ok, needsUpgrade } — if needsUpgrade is true, caller should re-hash and UPDATE.
export async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (stored && stored.startsWith('$2')) {
    return { ok: await bcrypt.compare(plain, stored), needsUpgrade: false };
  }
  // Legacy plaintext row — accept and flag for upgrade.
  return { ok: plain === stored, needsUpgrade: true };
}

export async function upgradePasswordHash(playerId: string, plain: string): Promise<void> {
  const hash = await hashPassword(plain);
  await getClient().execute({
    sql: 'UPDATE players SET password = ? WHERE id = ?',
    args: [hash, playerId]
  });
}

export interface TokenPayload {
  sub: string;
  role: 'master' | 'admin' | 'player';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === 'object' && decoded && 'sub' in decoded && 'role' in decoded) {
      return { sub: String(decoded.sub), role: (decoded as any).role };
    }
    return null;
  } catch {
    return null;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: TokenPayload;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.auth = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || (req.auth.role !== 'master' && req.auth.role !== 'admin')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.role !== 'master') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
