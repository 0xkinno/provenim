import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { registerRoutes } from './routes.js';
import { paymentService } from './service.js';

dotenv.config();

const app = fastify({
  logger: true
});

async function bootstrap() {
  initDatabase();
  console.log('Database initialized successfully.');

  await app.register(cors, {
    origin: true
  });

  await registerRoutes(app);

  const port = parseInt(process.env.PORT || '3001', 10);
  const host = '0.0.0.0';

  await app.listen({ port, host });
  console.log(`Provenim API server running at http://localhost:${port}`);

  // Background Reconciler Worker running every 6 seconds
  setInterval(async () => {
    try {
      await paymentService.reconcilePendingIntents();
    } catch (err: any) {
      console.warn('Reconciler error:', err.message);
    }
  }, 6000);
}

bootstrap().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
