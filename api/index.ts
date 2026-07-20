import type { RequestHandler } from 'express';
import { createApp } from '../server/app.js';
import { initSchema } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

// Init schema + seed once per serverless instance (Vercel cold start).
// Memoized as a promise so concurrent first requests share one init run —
// a boolean flag would let both run ensureColumns' check-then-ALTER and 500.
let initPromise: Promise<void> | null = null;
const initOnce: RequestHandler = async (_req, _res, next) => {
  initPromise ??= (async () => {
    await initSchema();
    await seedDatabase();
  })();
  try {
    await initPromise;
  } catch (err) {
    initPromise = null; // let the next request retry
    throw err;
  }
  next();
};

export default createApp('https://gpga.vercel.app', initOnce);
