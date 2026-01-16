// import { Worker } from 'bullmq'; // ❌ IORedis kaldırıldı
// import IORedis from 'ioredis';   // ✅ IORedis artık ioredis paketinden
// import { AIAnalysisService } from './modules/aiAnalysis/services/aiAnalysis.service';
// import { redisConnection } from './utils/bullmq'; // defaultQueueOptions artık Worker'da gerekli değil

// // AIAnalysisService örneğini Worker içinde kullanmak için oluşturuyoruz.
// const aiAnalysisService = new AIAnalysisService();

// /**
//  * Worker'ın işleyeceği Job verisinin tip tanımı.
//  */
// interface IAnalyzeVideoJob {
//   videoResponseId: string;
// }

// /**
//  * BullMQ Worker'ı başlatma fonksiyonu.
//  */
// const startWorker = () => {
//   console.log('--- AI Analysis Worker Başlatılıyor ---');

//   const worker = new Worker<IAnalyzeVideoJob>(
//     'aiAnalysisQueue',
//     async (job) => {
//       // ----------------------------------------------------
//       // İşlemci Fonksiyonu (Processor Function)
//       // ----------------------------------------------------
      
//       const { videoResponseId } = job.data;
//       console.log(`[JOB ${job.id}] Video analizi başlatılıyor: ${videoResponseId}`);
      
//       const result = await aiAnalysisService.analyzeSingleVideo(videoResponseId);

//       console.log(`[JOB ${job.id}] Video analizi tamamlandı. Kayıt ID: ${result._id}`);
      
//       return { analysisId: result._id, status: 'completed' };
//     },
//     {
//       connection: redisConnection,
//       // settings: backoff ayarları kuyrukta tanımlandığı için burada gerekli değil.
//       // Diğer Worker ayarları buraya eklenebilir (örneğin concurrency: 5)
//     }
//   );

//   // ----------------------------------------------------
//   // Worker Olay Dinleyicileri (Event Listeners)
//   // ----------------------------------------------------

//   worker.on('completed', (job) => {
//     if (job) { // ✅ Tip güvenliği kontrolü
//         console.log(`[JOB ${job.id}] İşlem başarıyla tamamlandı.`);
//     }
//   });

//   worker.on('failed', (job, err) => {
//     if (job) { // ✅ Tip güvenliği kontrolü
//         console.error(`[JOB ${job.id}] İşlem başarısız oldu. Hata: ${err.message}`);
//     }
//     // NOT: Hata durumunda BullMQ otomatik tekrar dener. Tüm denemeler bitince 'failed' eventi tetiklenir.
//   });

//   worker.on('error', (err) => {
//     console.error(`Worker genel hata: ${err.message}`);
//   });
  
//   worker.on('ready', () => {
//     console.log('Worker bağlantısı başarılı ve işleri dinliyor...');
//   });
// };

// startWorker();