import type { RequestHandler } from 'express';
import { createApp } from '../server/app.js';
import { initSchema } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

// Init schema + seed once per serverless instance (Vercel cold start).
let initialized = false;
const initOnce: RequestHandler = async (_req, _res, next) => {
  if (!initialized) {
    await initSchema();
    await seedDatabase();
    initialized = true;
  }
  next();
};

export default createApp('https://gpga.vercel.app', initOnce);
