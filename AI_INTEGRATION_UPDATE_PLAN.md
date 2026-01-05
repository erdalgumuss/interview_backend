# 🔄 AI Server Entegrasyon Güncelleme Planı

Bu doküman, yeni AI Server API yapısına (CLIENT_API_GUIDE.md) geçiş için gerekli tüm güncellemeleri detaylı olarak açıklamaktadır.

---

## ✅ Uygulama Durumu

| Adım | Durum | Açıklama |
|------|-------|----------|
| ADIM 1 | ✅ Tamamlandı | Type/Interface tanımlamaları |
| ADIM 2 | ✅ Tamamlandı | AIAnalysis Model güncellemesi |
| ADIM 3 | ✅ Tamamlandı | AIAnalysis Service güncellemesi |
| ADIM 4 | ✅ Tamamlandı | Queue yapısı güncellemesi |
| ADIM 5 | ✅ Tamamlandı | Worker güncellemesi |
| ADIM 6 | ✅ Tamamlandı | Candidate Service güncellemesi |
| ADIM 7 | ⏳ Bekliyor | npm install çalıştırılmalı |

---

## 📋 Özet: Mevcut vs Yeni API Karşılaştırması

| Özellik | Mevcut Yapı | Yeni API (CLIENT_API_GUIDE) |
|---------|-------------|---------------------------|
| **Endpoint** | `POST /analyzeVideo` | `POST /api/interview-record` |
| **İşlem Modeli** | Video bazlı (tek tek) | Mülakat bazlı (batch) |
| **Response Tipi** | Senkron (direkt sonuç) | Asenkron (pipeline ID'leri) |
| **Sonuç Alma** | Response'da döner | Polling: `GET /api/job-result/:videoResponseId` |
| **Payload** | Minimal bilgi | Zengin meta, candidate, interview bilgisi |

---

## 🎯 Güncelleme Adımları

### ADIM 1: Yeni Type/Interface Tanımlamaları

**Dosya:** `src/modules/aiAnalysis/types/aiServer.types.ts` (YENİ)

```typescript
// ==============================================
// AI SERVER REQUEST TYPES
// ==============================================

export interface AIServerMeta {
  apiVersion: string;
  requestId: string;
  timestamp: string;
  callbackUrl?: string;
}

export interface AIServerCandidateEducation {
  school: string;
  degree: string;
  graduationYear: number;
}

export interface AIServerCandidateExperience {
  company: string;
  position: string;
  duration: string;
  description?: string;
}

export interface AIServerCandidateSkills {
  technical: string[];
  personal: string[];
  languages: string[];
}

export interface AIServerPersonalityTest {
  MBTI?: string;
  Big5?: {
    O: number; // Openness
    C: number; // Conscientiousness
    E: number; // Extraversion
    A: number; // Agreeableness
    N: number; // Neuroticism
  };
}

export interface AIServerCandidate {
  name: string;
  surname: string;
  email: string;
  education?: AIServerCandidateEducation[];
  experience?: AIServerCandidateExperience[];
  skills?: AIServerCandidateSkills;
  personalityTest?: AIServerPersonalityTest;
  cvUrl?: string;
}

export interface AIServerApplication {
  id: string;
  candidate: AIServerCandidate;
}

export interface AIServerQuestionVideo {
  videoResponseId: string;
  url: string;
}

export interface AIServerQuestionAIMetadata {
  complexityLevel: 'low' | 'medium' | 'high' | 'intermediate' | 'advanced';
  requiredSkills: string[];
}

export interface AIServerQuestion {
  id: string;
  order: number;
  duration: number;
  questionText: string;
  expectedAnswer?: string;
  keywords?: string[];
  aiMetadata?: AIServerQuestionAIMetadata;
  video: AIServerQuestionVideo;
}

export interface AIServerPosition {
  id: string;
  title: string;
  department?: string;
  competencyWeights?: {
    technical?: number;
    communication?: number;
    problem_solving?: number;
  };
  description?: string;
}

export interface AIServerInterview {
  id: string;
  title: string;
  type?: string;
  position?: AIServerPosition;
  questions: AIServerQuestion[];
}

export interface AIServerInterviewRecordRequest {
  meta: AIServerMeta;
  application: AIServerApplication;
  interview: AIServerInterview;
}

// ==============================================
// AI SERVER RESPONSE TYPES
// ==============================================

export interface AIServerPipelineInfo {
  questionId: string;
  pipelineId: string;
}

export interface AIServerInterviewRecordResponse {
  ok: boolean;
  interviewRecordId?: string;
  pipelines?: AIServerPipelineInfo[];
  error?: string;
}

// ==============================================
// AI SERVER JOB RESULT TYPES
// ==============================================

export interface AIServerTranscription {
  text: string;
  duration?: number;
  language?: string;
  confidence?: number;
}

export interface AIServerFaceScores {
  engagement?: number;
  confidence?: number;
  eye_contact?: number;
  dominant_emotion?: string;
  emotions?: {
    happy?: number;
    neutral?: number;
    sad?: number;
    angry?: number;
    surprise?: number;
  };
  details?: {
    avgEngagement?: number;
    eyeContactPercentage?: number;
    facialMovementScore?: number;
  };
}

export interface AIServerVoiceScores {
  confidence?: number;
  energy?: number;
  speech_rate?: number;
  clarity?: number;
  pitch_variance?: number;
  emotion?: string;
}

export interface AIServerEvaluationResult {
  contentScore?: number;
  technicalAccuracy?: number;
  keywordMatch?: string[];
  communicationScore?: number;
  overallScore?: number;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
}

export interface AIServerJobResult {
  _id: string;
  videoResponseId: string;
  jobId: string;
  pipelineStatus: 'queued' | 'in_progress' | 'done' | 'failed';
  transcription?: AIServerTranscription;
  faceScores?: AIServerFaceScores;
  voiceScores?: AIServerVoiceScores;
  evaluationResult?: AIServerEvaluationResult;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIServerJobResultResponse {
  status: 'success' | 'not_found' | 'error';
  result?: AIServerJobResult;
  message?: string;
}
```

---

### ADIM 2: AIAnalysis Model Güncellemesi

**Dosya:** `src/modules/aiAnalysis/models/aiAnalysis.model.ts`

Mevcut model'e yeni alanlar eklenmeli:

```typescript
// Mevcut interface'e eklenecek yeni alanlar
export interface IAIAnalysis extends Document {
  // ... mevcut alanlar ...
  
  // YENİ: AI Server pipeline bilgileri
  aiServerInterviewRecordId?: string;
  aiServerPipelineId?: string;
  aiServerJobId?: string;
  pipelineStatus?: 'queued' | 'in_progress' | 'done' | 'failed';
  
  // YENİ: Detaylı analiz sonuçları
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
    confidence?: number;
  };
  
  faceScores?: {
    engagement?: number;
    confidence?: number;
    eye_contact?: number;
    dominant_emotion?: string;
    emotions?: Record<string, number>;
  };
  
  voiceScores?: {
    confidence?: number;
    energy?: number;
    speech_rate?: number;
    clarity?: number;
    pitch_variance?: number;
    emotion?: string;
  };
  
  evaluationResult?: {
    contentScore?: number;
    technicalAccuracy?: number;
    keywordMatch?: string[];
    communicationScore?: number;
    overallScore?: number;
    feedback?: string;
    strengths?: string[];
    improvements?: string[];
  };
}
```

**Schema'ya eklenecekler:**

```typescript
const AIAnalysisSchema: Schema<IAIAnalysis> = new Schema({
  // ... mevcut alanlar ...
  
  // YENİ alanlar
  aiServerInterviewRecordId: { type: String },
  aiServerPipelineId: { type: String },
  aiServerJobId: { type: String },
  pipelineStatus: { 
    type: String, 
    enum: ['queued', 'in_progress', 'done', 'failed'],
    default: 'queued'
  },
  
  transcription: {
    text: String,
    duration: Number,
    language: String,
    confidence: Number,
  },
  
  faceScores: {
    engagement: Number,
    confidence: Number,
    eye_contact: Number,
    dominant_emotion: String,
    emotions: Schema.Types.Mixed,
  },
  
  voiceScores: {
    confidence: Number,
    energy: Number,
    speech_rate: Number,
    clarity: Number,
    pitch_variance: Number,
    emotion: String,
  },
  
  evaluationResult: {
    contentScore: Number,
    technicalAccuracy: Number,
    keywordMatch: [String],
    communicationScore: Number,
    overallScore: Number,
    feedback: String,
    strengths: [String],
    improvements: [String],
  },
}, { timestamps: true });
```

---

### ADIM 3: AI Analysis Service Güncellemesi

**Dosya:** `src/modules/aiAnalysis/services/aiAnalysis.service.ts`

Servis tamamen yeniden yapılandırılmalı:

```typescript
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import VideoResponseModel, { IVideoResponse } from '../../video/models/videoResponse.model';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import AIAnalysisModel, { IAIAnalysis } from '../models/aiAnalysis.model';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import {
  AIServerInterviewRecordRequest,
  AIServerInterviewRecordResponse,
  AIServerJobResultResponse,
  AIServerQuestion,
} from '../types/aiServer.types';

export class AIAnalysisService {
  private aiServerUrl: string;
  
  constructor() {
    this.aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:3000';
  }

  /**
   * YENİ: Tüm mülakat için batch analiz başlatır
   * Bu metot, bir başvurunun tüm video yanıtlarını tek seferde AI Server'a gönderir.
   */
  public async startInterviewAnalysis(applicationId: string): Promise<{
    interviewRecordId: string;
    pipelines: { questionId: string; pipelineId: string }[];
  }> {
    // 1) Application bilgilerini getir
    const application = await ApplicationModel.findById(applicationId)
      .populate('interviewId');
    
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) Interview bilgilerini getir
    const interview = await InterviewModel.findById(application.interviewId);
    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 3) Video yanıtlarını getir
    const videoResponses = await VideoResponseModel.find({ applicationId: application._id });
    if (!videoResponses.length) {
      throw new AppError('No video responses found', ErrorCodes.NOT_FOUND, 404);
    }

    // 4) Payload oluştur
    const payload = this.buildInterviewRecordPayload(application, interview, videoResponses);

    // 5) AI Server'a istek at
    const response = await this.sendInterviewRecordRequest(payload);

    // 6) Sonuçları kaydet (her video için AIAnalysis oluştur)
    for (const pipeline of response.pipelines || []) {
      const videoResponse = videoResponses.find(
        v => v.questionId.toString() === pipeline.questionId
      );
      
      if (videoResponse) {
        await AIAnalysisModel.create({
          videoResponseId: videoResponse._id,
          applicationId: application._id,
          questionId: videoResponse.questionId,
          aiServerInterviewRecordId: response.interviewRecordId,
          aiServerPipelineId: pipeline.pipelineId,
          pipelineStatus: 'queued',
          transcriptionText: '', // Henüz yok
        });
      }
    }

    return {
      interviewRecordId: response.interviewRecordId!,
      pipelines: response.pipelines || [],
    };
  }

  /**
   * YENİ: Polling ile sonuç kontrolü
   */
  public async checkAnalysisResult(videoResponseId: string): Promise<AIServerJobResultResponse> {
    const url = `${this.aiServerUrl}/api/job-result/${videoResponseId}`;
    
    try {
      const { data } = await axios.get<AIServerJobResultResponse>(url, { timeout: 10000 });
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { status: 'not_found', message: 'Sonuç henüz hazır değil' };
      }
      throw new AppError('AI Server connection error', ErrorCodes.SERVER_ERROR, 503);
    }
  }

  /**
   * YENİ: Analiz sonucu geldiğinde kaydet
   */
  public async saveAnalysisResult(videoResponseId: string, result: any): Promise<IAIAnalysis> {
    const analysis = await AIAnalysisModel.findOne({ 
      aiServerPipelineId: result.pipelineId 
    });

    if (!analysis) {
      throw new AppError('Analysis record not found', ErrorCodes.NOT_FOUND, 404);
    }

    // Sonuçları güncelle
    analysis.pipelineStatus = result.pipelineStatus;
    analysis.transcriptionText = result.transcription?.text || '';
    analysis.transcription = result.transcription;
    analysis.faceScores = result.faceScores;
    analysis.voiceScores = result.voiceScores;
    analysis.evaluationResult = result.evaluationResult;
    
    // Eski alanları da güncelle (geriye uyumluluk)
    analysis.overallScore = result.evaluationResult?.overallScore;
    analysis.communicationScore = result.evaluationResult?.communicationScore;
    analysis.keywordMatches = result.evaluationResult?.keywordMatch;
    analysis.strengths = result.evaluationResult?.strengths;
    analysis.analyzedAt = new Date();

    await analysis.save();

    // Video durumunu güncelle
    await VideoResponseModel.updateOne(
      { _id: analysis.videoResponseId },
      { status: 'processed', aiAnalysisId: analysis._id }
    );

    return analysis;
  }

  /**
   * HELPER: Interview Record payload oluştur
   */
  private buildInterviewRecordPayload(
    application: any,
    interview: any,
    videoResponses: IVideoResponse[]
  ): AIServerInterviewRecordRequest {
    
    // Questions dizisi oluştur
    const questions: AIServerQuestion[] = interview.questions.map((q: any) => {
      const videoResponse = videoResponses.find(
        v => v.questionId.toString() === q._id?.toString()
      );
      
      return {
        id: q._id?.toString() || '',
        order: q.order,
        duration: q.duration,
        questionText: q.questionText,
        expectedAnswer: q.expectedAnswer,
        keywords: q.keywords,
        aiMetadata: {
          complexityLevel: q.aiMetadata?.complexityLevel || 'medium',
          requiredSkills: q.aiMetadata?.requiredSkills || [],
        },
        video: {
          videoResponseId: videoResponse?._id?.toString() || '',
          url: videoResponse?.videoUrl || '',
        },
      };
    }).filter((q: AIServerQuestion) => q.video.url); // Sadece video yüklenmiş soruları dahil et

    return {
      meta: {
        apiVersion: '1.0.0',
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
      application: {
        id: application._id.toString(),
        candidate: {
          name: application.candidate.name,
          surname: application.candidate.surname,
          email: application.candidate.email,
          education: application.education?.map((e: any) => ({
            school: e.school,
            degree: e.degree,
            graduationYear: e.graduationYear,
          })),
          experience: application.experience?.map((e: any) => ({
            company: e.company,
            position: e.position,
            duration: e.duration,
            description: e.responsibilities,
          })),
          skills: {
            technical: application.skills?.technical || [],
            personal: application.skills?.personal || [],
            languages: application.skills?.languages || [],
          },
          personalityTest: application.personalityTestResults?.scores ? {
            Big5: {
              O: application.personalityTestResults.scores.openness || 0,
              C: application.personalityTestResults.scores.conscientiousness || 0,
              E: application.personalityTestResults.scores.extraversion || 0,
              A: application.personalityTestResults.scores.agreeableness || 0,
              N: application.personalityTestResults.scores.neuroticism || 0,
            },
          } : undefined,
          cvUrl: application.documents?.resume,
        },
      },
      interview: {
        id: interview._id.toString(),
        title: interview.title,
        type: 'async-video',
        position: {
          id: interview._id.toString(),
          title: interview.title,
          description: interview.description,
        },
        questions,
      },
    };
  }

  /**
   * HELPER: AI Server'a interview-record isteği gönder
   */
  private async sendInterviewRecordRequest(
    payload: AIServerInterviewRecordRequest
  ): Promise<AIServerInterviewRecordResponse> {
    const url = `${this.aiServerUrl}/api/interview-record`;
    
    try {
      const { data } = await axios.post<AIServerInterviewRecordResponse>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      
      if (!data.ok) {
        throw new AppError(data.error || 'AI Server error', ErrorCodes.SERVER_ERROR, 500);
      }
      
      return data;
    } catch (error: any) {
      console.error('AI Server error:', error.response?.data || error.message);
      throw new AppError(
        'AI analysis service unavailable or failed to process',
        ErrorCodes.SERVER_ERROR,
        503
      );
    }
  }

  /**
   * ESKİ: Geriye uyumluluk için (deprecated)
   * @deprecated Yeni yapıda startInterviewAnalysis kullanılmalı
   */
  public async analyzeSingleVideo(videoResponseId: string) {
    console.warn('⚠️ analyzeSingleVideo deprecated. Use startInterviewAnalysis instead.');
    // Eski implementasyon...
  }

  /**
   * Mevcut: Genel AI analizi hesaplama (değişiklik yok)
   */
  public async calculateGeneralAIAnalysis(applicationId: string) {
    // Mevcut implementasyon korunur
  }
}
```

---

### ADIM 4: Worker Güncellemesi

**Dosya:** `src/worker.ts`

Worker'ın iş mantığı değişmeli - artık tüm mülakat için batch işlem yapılacak:

```typescript
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AIAnalysisService } from './modules/aiAnalysis/services/aiAnalysis.service';
import { redisConnection } from './utils/bullmq';

const aiAnalysisService = new AIAnalysisService();

// YENİ: Batch analiz için job tipi
interface IStartAnalysisJob {
  applicationId: string;
}

// YENİ: Polling job tipi
interface ICheckResultJob {
  videoResponseId: string;
  pipelineId: string;
  applicationId: string;
  retryCount?: number;
}

const startWorker = () => {
  console.log('--- AI Analysis Worker Başlatılıyor ---');

  // YENİ: Mülakat analizi başlatma worker'ı
  const analysisStartWorker = new Worker<IStartAnalysisJob>(
    'aiAnalysisStartQueue',
    async (job) => {
      const { applicationId } = job.data;
      console.log(`[JOB ${job.id}] Mülakat analizi başlatılıyor: ${applicationId}`);
      
      const result = await aiAnalysisService.startInterviewAnalysis(applicationId);
      
      console.log(`[JOB ${job.id}] Analiz başlatıldı. InterviewRecordId: ${result.interviewRecordId}`);
      
      // Her pipeline için polling job'ları oluştur
      // (Bu kısım ayrı bir scheduling mekanizması gerektirebilir)
      
      return result;
    },
    { connection: redisConnection }
  );

  // YENİ: Sonuç polling worker'ı
  const resultCheckWorker = new Worker<ICheckResultJob>(
    'aiResultCheckQueue',
    async (job) => {
      const { videoResponseId, pipelineId, applicationId, retryCount = 0 } = job.data;
      
      console.log(`[JOB ${job.id}] Sonuç kontrolü: ${videoResponseId} (Deneme: ${retryCount + 1})`);
      
      const result = await aiAnalysisService.checkAnalysisResult(videoResponseId);
      
      if (result.status === 'success' && result.result) {
        await aiAnalysisService.saveAnalysisResult(videoResponseId, result.result);
        console.log(`[JOB ${job.id}] Analiz sonucu kaydedildi.`);
        return { status: 'completed', videoResponseId };
      }
      
      // Henüz hazır değilse, tekrar kuyruğa ekle (max 40 deneme = ~20 dakika)
      if (result.status === 'not_found' && retryCount < 40) {
        throw new Error('Result not ready yet'); // BullMQ retry mekanizması tetiklenecek
      }
      
      return { status: 'timeout', videoResponseId };
    },
    {
      connection: redisConnection,
      settings: {
        backoffStrategy: () => 30000, // Her 30 saniyede bir tekrar dene
      },
    }
  );

  // Event listeners
  analysisStartWorker.on('completed', (job) => {
    console.log(`[START JOB ${job?.id}] Tamamlandı.`);
  });

  analysisStartWorker.on('failed', (job, err) => {
    console.error(`[START JOB ${job?.id}] Hata: ${err.message}`);
  });

  resultCheckWorker.on('completed', (job) => {
    console.log(`[CHECK JOB ${job?.id}] Tamamlandı.`);
  });

  resultCheckWorker.on('failed', (job, err) => {
    console.error(`[CHECK JOB ${job?.id}] Hata: ${err.message}`);
  });
};

startWorker();
```

---

### ADIM 5: Queue Güncellemesi

**Dosya:** `src/utils/bullmq.ts`

Yeni kuyruklar eklenmeli:

```typescript
// ... mevcut imports ...

// YENİ: Analiz başlatma kuyruğu
export const aiAnalysisStartQueue = new Queue('aiAnalysisStartQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 500,
  },
});

// YENİ: Sonuç kontrol kuyruğu
export const aiResultCheckQueue = new Queue('aiResultCheckQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 40, // 40 deneme * 30 saniye = 20 dakika
    backoff: { type: 'fixed', delay: 30000 }, // Her 30 saniyede bir
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

// ... mevcut exports ...
export { aiAnalysisStartQueue, aiResultCheckQueue };
```

---

### ADIM 6: Candidate Service Güncellemesi

**Dosya:** `src/modules/application/services/candidate.service.ts`

Video yanıtı kaydedildiğinde yeni kuyruk kullanılmalı:

```typescript
// import değişikliği
import { aiAnalysisStartQueue } from '../../../utils/bullmq';

// saveVideoResponse metodunda değişiklik
public async saveVideoResponse(data: VideoResponseDTO, applicationId: string): Promise<IApplication> {
    // ... mevcut kod ...

    // 4) 🚀 KRİTİK ADIM: Tüm videolar yüklendiyse AI analizini başlat
    const interview = await InterviewModel.findById(application.interviewId);
    const totalQuestions = interview?.questions.length || 0;
    const uploadedVideos = await VideoResponseModel.countDocuments({ applicationId });

    if (uploadedVideos >= totalQuestions) {
        // Tüm videolar yüklendi, batch analizi başlat
        await aiAnalysisStartQueue.add('startAnalysis', { 
            applicationId: applicationId,
        });
        
        console.log(`✅ [BullMQ] Tüm videolar yüklendi. Batch AI analizi başlatılıyor.`);
        application.status = 'awaiting_ai_analysis';
    }

    return updatedApplication;
}
```

---

### ADIM 7: Environment Variables

**Dosya:** `.env`

```bash
# AI Server Configuration
AI_SERVER_URL=http://localhost:3000
AI_SERVER_TIMEOUT=30000
AI_POLL_INTERVAL=30000
AI_MAX_POLL_ATTEMPTS=40
AI_RETRY_ATTEMPTS=3
```

---

## 📦 Paket Bağımlılıkları

```bash
npm install uuid
npm install --save-dev @types/uuid
```

---

## 🔄 Migration Stratejisi

### Aşama 1: Paralel Çalışma (Önerilen)
1. Yeni type'ları ekle
2. Yeni servisi ayrı bir dosyada oluştur (`aiAnalysis.service.v2.ts`)
3. Feature flag ile yeni/eski sistemi kontrol et
4. Yeni sistemi test et

### Aşama 2: Geçiş
1. Mevcut işlenen verilerin tamamlanmasını bekle
2. Yeni sistemi aktif et
3. Eski sistemi devre dışı bırak

### Aşama 3: Temizlik
1. Eski kodları sil
2. Feature flag'leri kaldır
3. Dokümantasyonu güncelle

---

## ✅ Test Checklist

- [ ] `POST /api/interview-record` isteği doğru payload ile gönderiliyor
- [ ] Pipeline ID'leri veritabanına kaydediliyor
- [ ] Polling mekanizması 30 saniyede bir çalışıyor
- [ ] Sonuçlar geldiğinde `AIAnalysis` modeli güncelleniyor
- [ ] Tüm sonuçlar geldiğinde `generalAIAnalysis` hesaplanıyor
- [ ] Hata durumlarında retry mekanizması çalışıyor
- [ ] Timeout durumlarında uygun log ve alert oluşuyor

---

## 🚨 Önemli Notlar

1. **Video URL'leri:** AI Server'ın video URL'lerine erişebilmesi gerekiyor. AWS S3 signed URL veya public URL kullanılmalı.

2. **Timeout:** AI analizi 2-10 dakika sürebilir. Polling mekanizması bu süreyi karşılamalı.

3. **Error Handling:** AI Server'dan gelen hataların düzgün loglanması ve izlenmesi kritik.

4. **Rate Limiting:** AI Server'a çok fazla istek atmaktan kaçınılmalı. Polling interval minimum 30 saniye olmalı.

---

**Son Güncelleme:** 11 Aralık 2025  
**Versiyon:** 1.0.0
