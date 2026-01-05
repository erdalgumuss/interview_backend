# 🏗️ Interview Backend - Mimari Dokümantasyonu

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Modül Yapısı](#modül-yapısı)
3. [Veri Modelleri](#veri-modelleri)
4. [AI Server Entegrasyonu](#ai-server-entegrasyonu)
5. [İş Akışları](#iş-akışları)
6. [Güncel API Endpoint Yapısı](#güncel-api-endpoint-yapısı)

---

## Genel Bakış

Bu backend, online mülakat sisteminin temel altyapısını sağlar. İK kullanıcıları mülakat ve soru setleri oluşturur, adaylar video yanıtlar yükler ve bu yanıtlar AI Server'a gönderilerek analiz edilir.

### Teknoloji Stack

| Bileşen | Teknoloji |
|---------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Queue | Redis + BullMQ |
| HTTP Client | Axios |
| Authentication | JWT (Cookie-based) |
| File Storage | AWS S3/CloudFront |

---

## Modül Yapısı

```
src/
├── config/           # Veritabanı konfigürasyonları
├── constants/        # Hata kodları ve sabitler
├── middlewares/      # Auth, validation, error handling
├── modules/          # Ana iş modülleri
│   ├── aiAnalysis/   # AI analiz yönetimi
│   ├── application/  # Aday başvuru yönetimi
│   ├── auth/         # Kimlik doğrulama
│   ├── interview/    # Mülakat yönetimi
│   ├── personalityTest/ # Kişilik testi
│   └── video/        # Video yanıt yönetimi
├── routes/           # Ana router yapısı
├── utils/            # Yardımcı fonksiyonlar (BullMQ, token, email)
├── server.ts         # Express uygulama başlangıcı
└── worker.ts         # BullMQ Worker (AI analiz işleri)
```

### Modül Detayları

#### 1. Auth Modülü (`/modules/auth/`)
- **Görev:** Kullanıcı kayıt, giriş, şifre sıfırlama
- **Endpoints:** `/api/auth/*`, `/api/profile/*`
- **Modeller:** `User`, `Token`

#### 2. Interview Modülü (`/modules/interview/`)
- **Görev:** Mülakat ve soru seti yönetimi
- **Endpoints:** `/api/interviews/*`
- **Modeller:** `Interview`, `InterviewQuestion`
- **Özellikler:**
  - Soru setleri oluşturma
  - Mülakat linki oluşturma
  - AI analiz ayarları

#### 3. Application Modülü (`/modules/application/`)
- **Görev:** Aday başvuruları, OTP doğrulama
- **Endpoints:** `/api/applications/*`
- **Modeller:** `Application`
- **Özellikler:**
  - Aday profil yönetimi
  - Eğitim, deneyim, beceri bilgileri
  - Video yanıtları
  - AI analiz sonuçları

#### 4. Video Modülü (`/modules/video/`)
- **Görev:** Video yanıt yönetimi
- **Endpoints:** `/api/video/*`
- **Modeller:** `VideoResponse`
- **Özellikler:**
  - Video URL kayıt
  - İşleme durumu takibi

#### 5. AI Analysis Modülü (`/modules/aiAnalysis/`)
- **Görev:** AI sunucusu ile iletişim ve analiz yönetimi
- **Modeller:** `AIAnalysis`
- **Özellikler:**
  - Tekil video analizi
  - Genel başvuru analizi hesaplama

---

## Veri Modelleri

### Interview Model
```typescript
interface IInterview {
  title: string;
  description?: string;
  expirationDate: Date;
  createdBy: { userId: ObjectId };
  status: 'active' | 'completed' | 'published' | 'draft' | 'inactive';
  personalityTestId?: ObjectId;
  stages: { personalityTest: boolean; questionnaire: boolean };
  interviewLink: { link: string; expirationDate?: Date };
  questions: IInterviewQuestion[];
  aiAnalysisSettings: {
    useAutomaticScoring: boolean;
    gestureAnalysis: boolean;
    speechAnalysis: boolean;
    eyeContactAnalysis: boolean;
    tonalAnalysis: boolean;
    keywordMatchScore: number;
  };
}

interface IInterviewQuestion {
  _id?: ObjectId;
  questionText: string;
  expectedAnswer: string;
  explanation?: string;
  keywords: string[];
  order: number;
  duration: number;
  aiMetadata: {
    complexityLevel: 'low' | 'medium' | 'high';
    requiredSkills: string[];
    keywordMatchScore?: number;
  };
}
```

### Application Model
```typescript
interface IApplication {
  interviewId: ObjectId;
  candidate: ICandidateProfile;
  education: ICandidateEducation[];
  experience: ICandidateExperience[];
  skills: ICandidateSkills;
  documents: ICandidateDocuments;
  status: ApplicationStatus;
  personalityTestResults?: IPersonalityTestResults;
  aiAnalysisResults: ObjectId[];
  latestAIAnalysisId?: ObjectId;
  generalAIAnalysis?: IGeneralAIAnalysis;
  responses: IApplicationResponse[];
}

type ApplicationStatus = 
  | 'pending' 
  | 'awaiting_video_responses' 
  | 'in_progress' 
  | 'awaiting_ai_analysis' 
  | 'completed' 
  | 'rejected' 
  | 'accepted';
```

### VideoResponse Model
```typescript
interface IVideoResponse {
  applicationId: ObjectId;
  questionId: ObjectId;
  videoUrl: string;
  duration: number;
  status: 'pending' | 'processed';
  uploadedAt: Date;
  aiAnalysisId?: ObjectId;
}
```

### AIAnalysis Model
```typescript
interface IAIAnalysis {
  videoResponseId: ObjectId;
  applicationId: ObjectId;
  questionId: ObjectId;
  transcriptionText: string;
  overallScore?: number;
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;
  keywordMatches?: string[];
  strengths?: string[];
  improvementAreas?: { area: string; recommendation: string }[];
  recommendation?: string;
  analyzedAt: Date;
}
```

---

## AI Server Entegrasyonu

### Mevcut Yapı

#### Endpoint
```typescript
const aiServerUrl = process.env.AI_SERVER_URL + '/analyzeVideo';
```

#### Mevcut Payload Yapısı
```typescript
// aiAnalysis.service.ts - analyzeSingleVideo()
const payload = {
  videoUrl: video.videoUrl,
  applicationId: application._id,
  question: {
    text: question.questionText,
    expectedAnswer: question.expectedAnswer,
    keywords: question.keywords,
    order: question.order,
    duration: question.duration,
  },
  interview: {
    title: interview.title,
    stages: interview.stages,
    expirationDate: interview.expirationDate,
  },
};
```

#### Mevcut Response Yapısı (Beklenen)
```typescript
interface IAIAnalysisResponse {
  transcriptionText: string;
  overallScore?: number;
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;
  keywordMatches?: string[];
  strengths?: string[];
  improvementAreas?: { area: string; recommendation: string }[];
  recommendation?: string;
}
```

### BullMQ Kuyruk Yapısı

#### Kuyruk Adı: `aiAnalysisQueue`
```typescript
// utils/bullmq.ts
export const aiAnalysisQueue = new Queue('aiAnalysisQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 500,
  },
});
```

#### Worker İşlemi
```typescript
// worker.ts
const worker = new Worker<IAnalyzeVideoJob>(
  'aiAnalysisQueue',
  async (job) => {
    const { videoResponseId } = job.data;
    const result = await aiAnalysisService.analyzeSingleVideo(videoResponseId);
    return { analysisId: result._id, status: 'completed' };
  },
  { connection: redisConnection }
);
```

---

## İş Akışları

### 1. Mülakat Oluşturma Akışı
```
İK → POST /api/interviews/create → Interview oluşturulur
İK → PATCH /api/interviews/:id/link → Mülakat linki oluşturulur
```

### 2. Aday Başvuru Akışı
```
Aday → POST /api/applications/start → Application oluşturulur + OTP gönderilir
Aday → POST /api/applications/verify-otp → OTP doğrulanır + JWT token döner
Aday → PUT /api/applications/details → Eğitim/deneyim bilgileri güncellenir
Aday → POST /api/applications/video-response → Video yanıtı kaydedilir
      └→ BullMQ kuyruğuna AI analizi eklenir
```

### 3. AI Analiz Akışı (Mevcut)
```
[BullMQ Worker] → aiAnalysisService.analyzeSingleVideo(videoResponseId)
  ├→ Video bilgisi çekilir (VideoResponseModel)
  ├→ Application bilgisi çekilir
  ├→ Interview + Question bilgisi çekilir
  ├→ AI Server'a POST /analyzeVideo isteği atılır
  ├→ Sonuç AIAnalysisModel'e kaydedilir
  ├→ VideoResponse status 'processed' yapılır
  └→ Tüm videolar işlendiyse generalAIAnalysis hesaplanır
```

---

## Güncel API Endpoint Yapısı

### Auth Endpoints
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Kullanıcı kaydı |
| POST | `/api/auth/login` | Kullanıcı girişi |
| POST | `/api/auth/logout` | Çıkış |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama isteği |
| POST | `/api/auth/reset-password` | Şifre sıfırlama |

### Interview Endpoints
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/interviews/create` | Mülakat oluştur |
| GET | `/api/interviews/all` | Tüm mülakatlar (Admin) |
| GET | `/api/interviews/my` | Kullanıcının mülakatları |
| GET | `/api/interviews/dashboard` | Dashboard verileri |
| GET | `/api/interviews/:id` | Mülakat detayı |
| PUT | `/api/interviews/:id` | Mülakat güncelle |
| DELETE | `/api/interviews/:id` | Mülakat sil |
| PATCH | `/api/interviews/:id/link` | Link oluştur |
| PATCH | `/api/interviews/:id/questions` | Soruları güncelle |
| PATCH | `/api/interviews/:id/personality-test` | Kişilik testi ekle |

### Application Endpoints
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/applications/start` | Başvuru başlat |
| POST | `/api/applications/verify-otp` | OTP doğrula |
| PUT | `/api/applications/details` | Aday detay güncelle |
| POST | `/api/applications/video-response` | Video yanıtı kaydet |
| POST | `/api/applications/personality-test` | Kişilik testi yanıtı |

---

## 🔄 AI Server Entegrasyon Güncelleme Gereksinimleri

### Yeni AI Server API'si ile Uyumsuzluklar

Mevcut backend, eski AI Server API yapısını kullanmaktadır. Yeni CLIENT_API_GUIDE.md dokümanına göre aşağıdaki güncellemeler gereklidir:

| Alan | Mevcut | Yeni API |
|------|--------|----------|
| Endpoint | `/analyzeVideo` | `/api/interview-record` |
| Payload Yapısı | Tekil video bazlı | Tüm mülakat bazlı (batch) |
| Response | Senkron analiz sonucu | Asenkron (pipeline ID'leri) |
| Sonuç Alma | Yok (direkt response) | Polling ile `/api/job-result/:id` |

Detaylı güncelleme adımları için `AI_INTEGRATION_UPDATE_PLAN.md` dosyasına bakınız.

---

**Son Güncelleme:** 11 Aralık 2025  
**Versiyon:** 1.0.0
