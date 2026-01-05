# 🤖 AI Analysis Module

## 📋 Genel Bakış

AI Analysis modülü, video mülakat yanıtlarının yapay zeka ile analiz edilmesinden sorumludur. Bu modül, harici bir AI Server ile entegre çalışarak video içeriklerinden transkripsiyon, yüz analizi, ses analizi ve değerlendirme sonuçları üretir.

## 🎯 Modülün Amaçları

- Adayın her video yanıtını AI modeline gönderip detaylı analiz almak
- AI analizi sonuçlarını veritabanında saklamak
- Başvuruya özel genel (ortalama) AI özet raporları oluşturmak
- İK ekibine her aday için güçlü yönler, zayıf yönler ve öneriler sunmak

## 🏗️ Mimari Yapı

```
aiAnalysis/
├── controllers/
│   └── aiAnalysis.controller.ts    # HTTP isteklerini yöneten controller
├── models/
│   └── aiAnalysis.model.ts         # MongoDB şeması ve interface tanımları
├── services/
│   └── aiAnalysis.service.ts       # İş mantığı ve AI Server entegrasyonu
├── types/
│   └── aiServer.types.ts           # AI Server API tip tanımları
└── README.md                       # Bu dosya
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `video` | Veri Kaynağı | VideoResponse modelinden video URL'lerini okur |
| `application` | Veri Kaynağı | Application modelinden aday ve başvuru bilgilerini alır |
| `interview` | Veri Kaynağı | Interview modelinden soru ve mülakat bilgilerini çeker |

### Dış Bağımlılıklar
| Servis | Protokol | Açıklama |
|--------|----------|----------|
| AI Server | HTTP REST | Video analizi için harici AI servisi |
| BullMQ | Queue | Asenkron iş kuyruğu yönetimi |

---

## 📊 Veri Modeli

### IAIAnalysis Interface

```typescript
interface IAIAnalysis {
  // Temel İlişkiler
  videoResponseId: ObjectId;      // Video yanıtı referansı
  applicationId: ObjectId;        // Başvuru referansı
  questionId: ObjectId;           // Soru referansı
  
  // AI Server Pipeline Bilgileri
  aiServerInterviewRecordId?: string;
  aiServerPipelineId?: string;
  aiServerJobId?: string;
  pipelineStatus?: 'queued' | 'in_progress' | 'done' | 'failed';
  
  // Transkripsiyon
  transcriptionText: string;
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
    confidence?: number;
  };
  
  // Yüz Analizi
  faceScores?: {
    engagement?: number;
    confidence?: number;
    eye_contact?: number;
    dominant_emotion?: string;
    emotions?: Record<string, number>;
  };
  
  // Ses Analizi
  voiceScores?: {
    confidence?: number;
    energy?: number;
    speech_rate?: number;
    clarity?: number;
    pitch_variance?: number;
    emotion?: string;
  };
  
  // Değerlendirme Sonuçları
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
  
  // Skor Özeti (Geriye Uyumluluk)
  overallScore?: number;
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;
  keywordMatches?: string[];
  strengths?: string[];
  improvementAreas?: { area: string; recommendation: string; }[];
  recommendation?: string;
  analyzedAt: Date;
}
```

---

## 🔄 İş Akışları

### 1. Batch Interview Analysis (Yeni API)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────────┐
│  Application │────▶│   BullMQ    │────▶│  AIAnalysisService   │
│  (Tüm Video) │     │   Queue     │     │  startInterviewAnalysis │
└─────────────┘     └─────────────┘     └──────────────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │    AI Server         │
                                        │ POST /interview-record│
                                        └──────────────────────┘
                                                   │
                                                   ▼
                          ┌────────────────────────────────────────┐
                          │  Polling Loop (checkAnalysisResult)    │
                          │  - Her video için sonuç kontrolü       │
                          │  - Tamamlanınca saveAnalysisResult     │
                          └────────────────────────────────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │ calculateGeneralAI   │
                                        │ Analysis             │
                                        │ status: 'completed'  │
                                        └──────────────────────┘
```

### 2. Single Video Analysis (Eski API - Deprecated)

```
Client ──▶ Controller ──▶ Service ──▶ AI Server ──▶ MongoDB
                                          │
                              ┌───────────┴───────────┐
                              │  Sonuçlar:            │
                              │  - Transkripsiyon     │
                              │  - Skorlar            │
                              │  - Anahtar kelimeler  │
                              │  - Öneriler           │
                              └───────────────────────┘
```

---

## 📡 API Endpoints

### Controller Endpoints

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/ai/analyze/video/:videoResponseId` | Tek video analizi (Deprecated) | Required |
| `POST` | `/api/ai/analyze/application/:applicationId` | Genel analiz hesapla | Required |

### AI Server Entegrasyonu

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/interview-record` | Batch analiz başlat |
| `GET` | `/api/job-result/:videoResponseId` | Sonuç kontrolü (Polling) |

---

## 🔧 Service Metodları

### AIAnalysisService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `startInterviewAnalysis` | `applicationId: string` | `{ interviewRecordId, pipelines[] }` | Tüm mülakat için batch analiz başlatır |
| `checkAnalysisResult` | `videoResponseId: string` | `AIServerJobResultResponse` | Pipeline sonucunu kontrol eder |
| `saveAnalysisResult` | `videoResponseId, result` | `IAIAnalysis` | Analiz sonucunu kaydeder |
| `analyzeSingleVideo` | `videoResponseId: string` | `IAIAnalysis` | **[Deprecated]** Tek video analizi |
| `calculateGeneralAIAnalysis` | `applicationId: string` | `IGeneralAIAnalysis` | Genel başvuru analizini hesaplar |

---

## 📦 Request/Response Yapıları

### AI Server Interview Record Request

```typescript
interface AIServerInterviewRecordRequest {
  meta: {
    apiVersion: string;
    requestId: string;
    timestamp: string;
  };
  application: {
    id: string;
    candidate: {
      name: string;
      surname: string;
      email: string;
      education?: Array<{ school, degree, graduationYear }>;
      experience?: Array<{ company, position, duration }>;
      skills?: { technical[], personal[], languages[] };
      personalityTest?: { Big5: { O, C, E, A, N } };
      cvUrl?: string;
    };
  };
  interview: {
    id: string;
    title: string;
    type: string;
    position?: { title, department, description };
    questions: Array<{
      id: string;
      order: number;
      duration: number;
      questionText: string;
      expectedAnswer?: string;
      keywords?: string[];
      aiMetadata?: { complexityLevel, requiredSkills[] };
      video: { videoResponseId, url };
    }>;
  };
}
```

### AI Server Job Result Response

```typescript
interface AIServerJobResultResponse {
  status: 'success' | 'not_found' | 'error';
  result?: {
    videoResponseId: string;
    jobId: string;
    pipelineStatus: 'queued' | 'in_progress' | 'done' | 'failed';
    transcription?: { text, duration, language, confidence };
    faceScores?: { engagement, confidence, eye_contact, emotions };
    voiceScores?: { confidence, energy, speech_rate, clarity };
    evaluationResult?: { overallScore, strengths[], improvements[] };
  };
}
```

---

## ⚙️ Konfigürasyon

### Çevre Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `AI_SERVER_URL` | `http://localhost:3000` | AI Server base URL |

---

## 🔒 Güvenlik Notları

1. **API Timeout**: AI Server istekleri için 30 saniye timeout ayarlanmıştır
2. **Rate Limiting**: AI Server'a gönderilen istekler kuyruk sistemi ile kontrol edilir
3. **Error Handling**: AI Server hataları 503 Service Unavailable olarak döner

---

## 📈 Performans Önerileri

1. **Batch Processing**: Tek tek video yerine tüm mülakatı toplu gönderme tercih edilmeli
2. **Polling Interval**: Sonuç kontrolü için uygun aralıklar belirlenmeli
3. **Retry Logic**: Başarısız analizler için yeniden deneme mekanizması mevcut

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Başarılı Analiz | Tüm videolar yüklenmiş başvuru | `analysis_completed` durumu |
| Eksik Video | Bazı sorular cevaplanmamış | Hata: `No video responses found` |
| AI Server Hatası | Server erişilemez | 503 Service Unavailable |
| Timeout | AI Server yanıt vermedi | Retry kuyruğuna ekleme |

---

## 📝 Versiyon Notları

### v2.0 (Güncel)
- Batch interview analysis API eklendi
- Pipeline-based asenkron işleme
- Detaylı yüz ve ses analizi desteği

### v1.0 (Deprecated)
- Tek video analizi endpoint'i
- Senkron işleme

---

## 🔗 İlgili Dokümantasyon

- [AI Server CLIENT_API_GUIDE.md](../../docs/AI_SERVER_API.md)
- [Application Module](../application/README.md)
- [Video Module](../video/README.md)

Güçlü yönler (strengths) ve gelişim alanları (improvement areas) birleştirilir.

Genel tavsiye metni oluşturulur.

Başvuru kaydına generalAIAnalysis alanı olarak işlenir.

🧩 Kullanılan Yapılar

Yapı Açıklama
Axios AI sunucusuna HTTP POST ile istek gönderir.
Mongoose Modelleri VideoResponseModel, ApplicationModel, InterviewModel, AIAnalysisModel kullanılır.
Error Handling Her kritik adımda özel hata fırlatılır (AppError).
Environment Variable AI sunucu URL'i .env dosyasından alınır (AI_SERVER_URL).
🛡️ Güvenlik ve Dayanıklılık Önlemleri
AI sunucusuna istek atılamazsa hata loglanır ve 503 döndürülür.

İlgili başvuru, video veya soru bulunamazsa özel 404 hatası döner.

AI'dan alınan her sonuç detaylı kontrol edilip veritabanına güvenli şekilde kaydedilir.

🎬 Genel AI Analizi Süreci

sequenceDiagram
Aday ->> Sunucu: Video yükler
Sunucu ->> AIAnalysisService: Kuyruğa ekler (async)
AIAnalysisService ->> AI Server: POST analyzeVideo (videoUrl + soru + mülakat bilgisi)
AI Server -->> AIAnalysisService: AI analiz sonucu JSON
AIAnalysisService ->> MongoDB: AI sonucu kaydeder
AIAnalysisService ->> Application: Başvuru kaydını günceller
🛠️ Kullanım Örnekleri
Tek Bir Videoyu Analiz Etmek
const aiService = new AIAnalysisService();
await aiService.analyzeSingleVideo('VIDEO_RESPONSE_ID');
Bir Başvuruya Ait Genel AI Analizi Çıkarmak
typescript
Kopyala
Düzenle
const aiService = new AIAnalysisService();
await aiService.calculateGeneralAIAnalysis('APPLICATION_ID');
📦 Önemli Bağımlılıklar
axios – Dış AI servisi ile haberleşmek için.

mongoose – Veritabanı işlemleri için.

dotenv – Ortam değişkenlerini almak için.

✅ Özet
AI Analysis Modülü, video yanıtlar üzerinde gelişmiş bir AI tabanlı analiz süreci sağlar.
Bu analizler sayesinde İK ekibi, adayların hem teknik hem de iletişim becerilerini nesnel verilerle değerlendirebilir.

İlerleyen aşamalarda sistem:

Gerçek zamanlı kuyruk bazlı analiz

Otomatik bilgilendirme sistemleri

Daha ileri düzey raporlama panelleri ile güçlendirilecektir.
