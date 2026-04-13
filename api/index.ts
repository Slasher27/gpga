import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initSchema } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import { requireAuth } from '../server/auth-middleware.js';
import playersRouter from '../server/routes/players.js';
import seasonsRouter from '../server/routes/seasons.js';
import roundsRouter from '../server/routes/rounds.js';
import scoresRouter from '../server/routes/scores.js';
import finesRouter from '../server/routes/fines.js';
import coursesRouter from '../server/routes/courses.js';
import authRouter from '../server/routes/auth.js';
import buyInRouter from '../server/routes/buy-in.js';
import teamsRouter from '../server/routes/teams.js';
import notificationsRouter from '../server/routes/notifications.js';
import pushRouter from '../server/routes/push.js';

const app = express();

const allowedOrigin = process.env.FRONTEND_URL || 'https://gpga.vercel.app';
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

// Init schema + seed on first request (Vercel cold start)
let initialized = false;
app.use(async (_req, _res, next) => {
  if (!initialized) {
    await initSchema();
    await seedDatabase();
    initialized = true;
  }
  next();
});

// Public routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authLimiter, authRouter);

// Protected routes — all require a valid JWT
app.use('/api/players', requireAuth, playersRouter);
app.use('/api/seasons', requireAuth, seasonsRouter);
app.use('/api/rounds', requireAuth, roundsRouter);
app.use('/api/scores', requireAuth, scoresRouter);
app.use('/api/fines', requireAuth, finesRouter);
app.use('/api/courses', requireAuth, coursesRouter);
app.use('/api/buy-in', requireAuth, buyInRouter);
app.use('/api/teams', requireAuth, teamsRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);
app.use('/api/push', requireAuth, pushRouter);

export default app;
