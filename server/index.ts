import 'dotenv/config';
import { createApp } from './app.js';
import { initSchema } from './db.js';
import { seedDatabase } from './seed.js';

const app = createApp('http://localhost:5173');
const PORT = process.env.PORT || 3001;

async function start() {
  await initSchema();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`GPGA API server running on http://localhost:${PORT}`);
  });
}

start();

export default app;
