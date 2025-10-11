import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// ----------------------------------------------------
// 1. Redis Bağlantı Yapılandırması
// ----------------------------------------------------

// BullMQ, bağlantı detaylarını paylaşan ayrı bir Redis bağlantı nesnesi kullanmanızı önerir.
// Ortam değişkenlerinden (process.env) okuma yapılır.
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined, // Eğer şifre varsa
  maxRetriesPerRequest: null, // Redis bağlantısı kesildiğinde otomatik yeniden bağlanma
  enableReadyCheck: false,
});

/**
 * BullMQ için varsayılan seçenekler.
 * Bu ayarlar, işlerin (job) tekrar deneme ve yaşam süresi gibi davranışlarını belirler.
 */
const defaultQueueOptions = {
  // İş tekrar denemesi (Retry) ayarları:
  attempts: 3,             // Başarısız olursa 3 kez daha dene
  backoff: {
    type: 'exponential',   // Tekrar denemeler arasındaki süreyi katlanarak artır (örneğin 1sn, 3sn, 9sn)
    delay: 5000,           // İlk tekrar denemesinden önce 5 saniye bekle
  },
  removeOnComplete: true,  // Başarılı işleri otomatik olarak kuyruktan temizle
  removeOnFail: 500,       // Başarısız işleri 500 adet sakla
};

// ----------------------------------------------------
// 2. Kuyruk Tanımları
// ----------------------------------------------------

/**
 * AI Analiz Kuyruğu (AI Analysis Queue)
 * Yeni bir video yüklendiğinde, analiz işleri bu kuyruğa eklenir.
 */
export const aiAnalysisQueue = new Queue('aiAnalysisQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultQueueOptions,
    // Ek kuyruğa özel ayarlar buraya eklenebilir.
  },
});

// ----------------------------------------------------
// 3. İlgili Utility Fonksiyonları (Worker için Gerekli)
// ----------------------------------------------------

// Bu, Worker sürecinin, kuyruk eventlerini (iş başladı, bitti, hata verdi) dinlemesi için.
export { IORedis, Queue, Worker, QueueEvents, redisConnection, defaultQueueOptions };