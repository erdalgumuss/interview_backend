import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AIAnalysisService } from './modules/aiAnalysis/services/aiAnalysis.service';
import { redisConnection, aiResultCheckQueue } from './utils/bullmq';
import { IStartAnalysisJobData, ICheckResultJobData } from './modules/aiAnalysis/types/aiServer.types';

// AIAnalysisService örneğini Worker içinde kullanmak için oluşturuyoruz.
const aiAnalysisService = new AIAnalysisService();

/**
 * @deprecated Eski API için - tekil video analizi
 * Worker'ın işleyeceği Job verisinin tip tanımı.
 */
interface IAnalyzeVideoJob {
  videoResponseId: string;
}

/**
 * BullMQ Worker'ları başlatma fonksiyonu.
 */
const startWorker = () => {
  console.log('--- AI Analysis Workers Başlatılıyor ---');

  // ==============================================
  // WORKER 1: Eski API - Tekil Video Analizi (Deprecated)
  // ==============================================
  const legacyWorker = new Worker<IAnalyzeVideoJob>(
    'aiAnalysisQueue',
    async (job) => {
      const { videoResponseId } = job.data;
      console.log(`[LEGACY JOB ${job.id}] Video analizi başlatılıyor: ${videoResponseId}`);
      
      const result = await aiAnalysisService.analyzeSingleVideo(videoResponseId);

      console.log(`[LEGACY JOB ${job.id}] Video analizi tamamlandı. Kayıt ID: ${result._id}`);
      
      return { analysisId: result._id, status: 'completed' };
    },
    { connection: redisConnection }
  );

  // ==============================================
  // WORKER 2: Yeni API - Mülakat Analizi Başlatma
  // ==============================================
  const analysisStartWorker = new Worker<IStartAnalysisJobData>(
    'aiAnalysisStartQueue',
    async (job) => {
      const { applicationId } = job.data;
      console.log(`[START JOB ${job.id}] Mülakat analizi başlatılıyor: ${applicationId}`);
      
      const result = await aiAnalysisService.startInterviewAnalysis(applicationId);
      
      console.log(`[START JOB ${job.id}] Analiz başlatıldı. InterviewRecordId: ${result.interviewRecordId}`);
      console.log(`[START JOB ${job.id}] ${result.pipelines.length} pipeline oluşturuldu.`);
      
      // Her pipeline için sonuç kontrolü job'ları oluştur
      for (const pipeline of result.pipelines) {
        await aiResultCheckQueue.add(
          'checkResult',
          {
            videoResponseId: pipeline.questionId, // questionId'yi videoResponseId olarak kullanıyoruz
            pipelineId: pipeline.pipelineId,
            applicationId: applicationId,
            retryCount: 0,
          } as ICheckResultJobData,
          {
            delay: 60000, // İlk kontrol 1 dakika sonra
          }
        );
      }
      
      return result;
    },
    { connection: redisConnection }
  );

  // ==============================================
  // WORKER 3: Yeni API - Sonuç Kontrolü (Polling)
  // ==============================================
  const resultCheckWorker = new Worker<ICheckResultJobData>(
    'aiResultCheckQueue',
    async (job) => {
      const { videoResponseId, pipelineId, applicationId, retryCount = 0 } = job.data;
      
      console.log(`[CHECK JOB ${job.id}] Sonuç kontrolü: ${videoResponseId} (Deneme: ${retryCount + 1})`);
      
      const response = await aiAnalysisService.checkAnalysisResult(videoResponseId);
      
      if (response.status === 'success' && response.result) {
        // Sonuç hazır - kaydet
        await aiAnalysisService.saveAnalysisResult(videoResponseId, response.result);
        console.log(`[CHECK JOB ${job.id}] ✅ Analiz sonucu kaydedildi: ${videoResponseId}`);
        return { status: 'completed', videoResponseId };
      }
      
      if (response.status === 'not_found') {
        // Henüz hazır değil - BullMQ retry mekanizması devreye girecek
        console.log(`[CHECK JOB ${job.id}] ⏳ Sonuç henüz hazır değil: ${videoResponseId}`);
        throw new Error('Result not ready yet');
      }
      
      // Hata durumu
      console.error(`[CHECK JOB ${job.id}] ❌ Hata: ${response.message}`);
      throw new Error(response.message || 'Unknown error');
    },
    { connection: redisConnection }
  );

  // ==============================================
  // EVENT LISTENERS
  // ==============================================

  // Legacy Worker Events
  legacyWorker.on('completed', (job) => {
    if (job) console.log(`[LEGACY ${job.id}] ✅ Tamamlandı`);
  });
  legacyWorker.on('failed', (job, err) => {
    if (job) console.error(`[LEGACY ${job.id}] ❌ Hata: ${err.message}`);
  });

  // Analysis Start Worker Events
  analysisStartWorker.on('completed', (job) => {
    if (job) console.log(`[START ${job.id}] ✅ Tamamlandı`);
  });
  analysisStartWorker.on('failed', (job, err) => {
    if (job) console.error(`[START ${job.id}] ❌ Hata: ${err.message}`);
  });

  // Result Check Worker Events
  resultCheckWorker.on('completed', (job) => {
    if (job) console.log(`[CHECK ${job.id}] ✅ Tamamlandı`);
  });
  resultCheckWorker.on('failed', (job, err) => {
    if (job) console.error(`[CHECK ${job.id}] ❌ Hata: ${err.message}`);
  });

  // Genel Error Handler
  [legacyWorker, analysisStartWorker, resultCheckWorker].forEach(worker => {
    worker.on('error', (err) => {
      console.error(`Worker genel hata: ${err.message}`);
    });
    worker.on('ready', () => {
      console.log(`Worker (${worker.name}) bağlantısı başarılı ve işleri dinliyor...`);
    });
  });

  console.log('✅ Tüm AI Analysis Worker\'ları başlatıldı.');
};

startWorker();