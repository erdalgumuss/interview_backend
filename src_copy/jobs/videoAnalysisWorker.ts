import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.ts';
import { processVideoAnalysis } from '../modules/videoAnalysis/videoAnalysisPipeline.ts';
import { connectMongoDB } from '../config/db.ts';
import dotenv from 'dotenv';

dotenv.config();

await connectMongoDB();
const videoWorker = new Worker(
  'videoAnalysisQueue',
  async (job) => {
    console.log(`🚀 Processing video job: ${job.id}`);
    const result = await processVideoAnalysis(job.data);
    return result;
  },
  {
    connection: redisConfig,
    concurrency: 1, // Aynı anda 2 video işlenebilir (ileride artırırız)
    lockDuration: 600000, // İşlem sırasında işin kilitlenmesini sağlar
  }
);

// Event Listener'lar
videoWorker.on('completed', (job) => {
  console.log(`Video Job ${job.id} completed!`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`Video Job ${job?.id} failed:`, err);
});

export default videoWorker;
