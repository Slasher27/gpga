import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './auth-middleware.js';
import playersRouter from './routes/players.js';
import seasonsRouter from './routes/seasons.js';
import roundsRouter from './routes/rounds.js';
import scoresRouter from './routes/scores.js';
import finesRouter from './routes/fines.js';
import coursesRouter from './routes/courses.js';
import authRouter from './routes/auth.js';
import buyInRouter from './routes/buy-in.js';
import teamsRouter from './routes/teams.js';
import notificationsRouter from './routes/notifications.js';
import pushRouter from './routes/push.js';

// Builds the Express app shared by the local server (server/index.ts) and the
// Vercel serverless function (api/index.ts). `preRoute` runs before any route —
// the serverless entry uses it to lazily init the DB on cold start.
export function createApp(defaultOrigin: string, preRoute?: RequestHandler) {
  const app = express();

  // Vercel terminates exactly one proxy hop — without this, req.ip is the proxy,
  // so the auth rate limiter would put every user in one shared bucket.
  app.set('trust proxy', 1);

  app.use(cors({ origin: process.env.FRONTEND_URL || defaultOrigin, credentials: false }));
  app.use(express.json());
  if (preRoute) app.use(preRoute);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later' },
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

  // Terminal error handler — Express 5 forwards rejected route promises here;
  // without it they render as HTML the client can't parse (silent UI failures).
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    const msg = err instanceof Error ? err.message : '';
    const isDuplicate = /UNIQUE constraint/i.test(msg);
    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate ? 'That already exists — duplicate value' : 'Server error — please try again',
    });
  };
  app.use(errorHandler);

  return app;
}
