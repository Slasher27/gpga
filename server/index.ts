import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import { seedDatabase } from './seed.js';
import playersRouter from './routes/players.js';
import seasonsRouter from './routes/seasons.js';
import roundsRouter from './routes/rounds.js';
import scoresRouter from './routes/scores.js';
import finesRouter from './routes/fines.js';
import coursesRouter from './routes/courses.js';
import authRouter from './routes/auth.js';
import buyInRouter from './routes/buy-in.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
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

// Initialize DB schema and seed, then start
async function start() {
  await initSchema();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`GPGA API server running on http://localhost:${PORT}`);
  });
}

start();

export default app;
