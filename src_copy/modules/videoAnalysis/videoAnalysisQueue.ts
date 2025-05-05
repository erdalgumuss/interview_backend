import { Queue } from 'bullmq';
import { redisConfig } from '../../config/redis.ts';

export const videoAnalysisQueue = new Queue('videoAnalysisQueue', {
  connection: redisConfig,
});

// HATA YAKALAMA: Ekstra loglama
videoAnalysisQueue.on('error', (err) => {
  console.error('🔥 BullMQ Queue Error:', err);
});

console.log('✅ videoAnalysisQueue initialized successfully');
