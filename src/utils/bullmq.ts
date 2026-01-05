import type { Queue as BullQueue } from 'bullmq';
import type { Redis } from 'ioredis';

/**
 * ----------------------------------------------------
 * Feature Flag
 * ----------------------------------------------------
 * Default: DISABLED
 * Açmak için: QUEUE_ENABLED=true
 */
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === 'true';

/**
 * ----------------------------------------------------
 * Export edilen referanslar (HER ZAMAN üst seviye)
 * ----------------------------------------------------
 */
export let aiAnalysisQueue: BullQueue | null = null;
export let aiAnalysisStartQueue: BullQueue | null = null;
export let aiResultCheckQueue: BullQueue | null = null;

export let redisConnection: Redis | null = null;
export let defaultQueueOptions: any = null;

// Worker tarafı için type exportları (kırılma olmasın)
export let Queue: any = null;
export let Worker: any = null;
export let QueueEvents: any = null;
export let IORedis: any = null;

/**
 * ----------------------------------------------------
 * BullMQ AKTİFSE initialize et
 * ----------------------------------------------------
 */
if (QUEUE_ENABLED) {
  console.log('🟢 BullMQ enabled');

  // Dinamik import → Redis side-effect sadece burada olur
  const bullmq = require('bullmq');
  const IORedisLib = require('ioredis');

  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  QueueEvents = bullmq.QueueEvents;
  IORedis = IORedisLib;

  redisConnection = new IORedisLib({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  defaultQueueOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 500,
  };

  aiAnalysisQueue = new Queue('aiAnalysisQueue', {
    connection: redisConnection,
    defaultJobOptions: defaultQueueOptions,
  });

  aiAnalysisStartQueue = new Queue('aiAnalysisStartQueue', {
    connection: redisConnection,
    defaultJobOptions: defaultQueueOptions,
  });

  aiResultCheckQueue = new Queue('aiResultCheckQueue', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 60,
      backoff: { type: 'fixed', delay: 30000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });
} else {
  console.warn('🛑 BullMQ disabled (QUEUE_ENABLED != true)');
}
