import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initSchema } from './db.js';
import { seedDatabase } from './seed.js';
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

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
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

async function start() {
  await initSchema();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`GPGA API server running on http://localhost:${PORT}`);
  });
}

start();

export default app;
