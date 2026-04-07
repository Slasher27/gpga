import express from 'express';
import cors from 'cors';
import { initSchema } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import playersRouter from '../server/routes/players.js';
import seasonsRouter from '../server/routes/seasons.js';
import roundsRouter from '../server/routes/rounds.js';
import scoresRouter from '../server/routes/scores.js';
import finesRouter from '../server/routes/fines.js';
import coursesRouter from '../server/routes/courses.js';
import authRouter from '../server/routes/auth.js';
import buyInRouter from '../server/routes/buy-in.js';

const app = express();

app.use(cors());
app.use(express.json());

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

app.use('/api/players', playersRouter);
app.use('/api/seasons', seasonsRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/scores', scoresRouter);
app.use('/api/fines', finesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/auth', authRouter);
app.use('/api/buy-in', buyInRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
