import Fastify from 'fastify';
import dotenv from 'dotenv';
import { analyzeVideoRoutes } from './routes/analyzeVideo.ts';
import { connectMongoDB } from './config/db.ts';
import fastifyExpress from '@fastify/express';

dotenv.config();
const server = Fastify({
  logger: true,
  requestTimeout: 30000, // 30 saniye
});
await server.register(fastifyExpress); // 🔥 JSON body parsing aktif!

// Basit health check endpoint'i
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});
await server.register(analyzeVideoRoutes, { prefix: '/api' });

// Sunucuyu başlat
const start = async () => {
  try {
    await connectMongoDB(); // <-- önce veritabanına bağlan
    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

