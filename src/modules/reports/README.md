# 📊 Reports Module

## 📋 Genel Bakış

Reports modülü, mülakat sisteminin kapsamlı analitik ve raporlama endpoint'lerini sağlar. İK ekibine pozisyon bazlı dağılımlar, yetkinlik analizleri, soru etkinliği raporları ve AI-HR uyum analizleri sunar.

## 🎯 Modülün Amaçları

- Aggregate KPI istatistikleri sunmak
- Pozisyon bazlı aday dağılımı analizi
- Rol yakınlığı ve yetkinlik dağılımı
- Soru bazlı ayırt edicilik analizi
- AI ve HR değerlendirme uyumu
- Zaman bazlı trend analizleri

## 🏗️ Mimari Yapı

```
reports/
├── controllers/
│   └── reports.controller.ts       # Endpoint handler'ları
├── middlewares/
│   └── cache.middleware.ts         # Cache yönetimi
├── routes/
│   └── reports.routes.ts           # Rota tanımları
├── services/
│   └── reports.service.ts          # İş mantığı ve aggregate query'ler
├── types/
│   └── reports.types.ts            # Tip tanımları
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `application` | Veri Kaynağı | Başvuru istatistikleri |
| `interview` | Veri Kaynağı | Mülakat istatistikleri |
| `aiAnalysis` | Veri Kaynağı | AI analiz sonuçları |

### Tasarım Prensipleri

- ❌ Aday (candidate) detayı vermez - GDPR uyumu
- ❌ Video / metin / AI raw output taşımaz  
- ✅ Sadece aggregate istatistik üretir
- ✅ Interview & AI servisleri source of truth olmaya devam eder
- ✅ Cache-friendly (ETag, conditional GET desteği)
- ✅ Tüm endpoint'ler read-only

---

## 📊 Veri Modeli

### IReportFilters Interface

```typescript
interface IReportFilters {
  positionIds?: string[];
  interviewIds?: string[];
  startDate?: Date;
  endDate?: Date;
  reviewerIds?: string[];
  tags?: string[];
  onlyFavorites?: boolean;
  status?: string[];
}
```

### Response Tipleri

```typescript
// Özet KPI
interface ISummaryResponse {
  totalInterviews: number;
  evaluatedInterviews: number;
  pendingInterviews: number;
  completedApplications: number;
  favoriteRatio: number;
  avgOverallScore: number;
  avgTechnicalScore: number;
  avgCommunicationScore: number;
  avgInterviewDurationSec: number;
}

// Pozisyon Dağılımı
interface IPositionDistributionItem {
  positionId: string;
  positionName: string;
  department?: string;
  distribution: {
    highFit: number;     // score >= 70
    mediumFit: number;   // 40 <= score < 70
    lowFit: number;      // score < 40
  };
  totalApplications: number;
}

// Rol Yakınlığı
interface IFitBucket {
  range: string;
  count: number;
  percentage: number;
}

interface ISkillScatterPoint {
  communication: number;
  technical: number;
  problemSolving: number;
}

// Soru Etkinliği
interface IQuestionEffectivenessItem {
  questionId: string;
  questionText: string;
  interviewTitle: string;
  varianceScore: number;          // Ayırt edicilik (0-1)
  avgAnswerDurationSec: number;
  analysisCompletionRate: number;
  avgScore: number;
  responseCount: number;
}

// AI-HR Uyum
interface IAIHRAlignmentResponse {
  overlapRatio: number;
  aiOnlyHigh: number;
  hrOnlyFavorite: number;
  bothHigh: number;
  totalEvaluated: number;
  alignmentTrend: Array<{ period: string; ratio: number }>;
}

// Zaman Trendi
interface ITimeTrendItem {
  period: string;
  applicationCount: number;
  avgScore: number;
  completionRate: number;
}
```

---

## 📡 API Endpoints

### Ortak Query Parametreleri

Tüm endpoint'ler aşağıdaki filtre parametrelerini destekler:

| Parametre | Tip | Açıklama | Örnek |
|-----------|-----|----------|-------|
| `interviewIds` | string | Virgülle ayrılmış mülakat ID'leri | `?interviewIds=abc,def` |
| `positionIds` | string | Virgülle ayrılmış pozisyon ID'leri | `?positionIds=1,2,3` |
| `startDate` | ISO date | Başlangıç tarihi | `?startDate=2024-01-01` |
| `endDate` | ISO date | Bitiş tarihi | `?endDate=2024-03-31` |
| `reviewerIds` | string | HR reviewer ID'leri | `?reviewerIds=5,7` |
| `tags` | string | Etiketler | `?tags=strong,medium` |
| `onlyFavorites` | boolean | Sadece favoriler | `?onlyFavorites=true` |
| `status` | string | Durum filtresi | `?status=completed,accepted` |

### Endpoint Listesi

| Method | Endpoint | Açıklama | Cache |
|--------|----------|----------|-------|
| `GET` | `/api/reports/summary` | Özet KPI şeridi | 5 dk |
| `GET` | `/api/reports/position-distribution` | Pozisyon bazlı dağılım | 10 dk |
| `GET` | `/api/reports/fit-distribution` | Rol yakınlığı dağılımı | 10 dk |
| `GET` | `/api/reports/question-effectiveness` | Soru ayırt ediciliği | 15 dk |
| `GET` | `/api/reports/ai-hr-alignment` | AI-HR uyum analizi | 10 dk |
| `GET` | `/api/reports/time-trends` | Zaman bazlı trendler | 10 dk |

---

## 🔧 Service Metodları

### ReportsService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `getSummary` | `IReportFilters` | `ISummaryResponse` | KPI özeti |
| `getPositionDistribution` | `IReportFilters` | `IPositionDistributionResponse` | Pozisyon dağılımı |
| `getFitDistribution` | `IReportFilters` | `IFitDistributionResponse` | Yetkinlik dağılımı |
| `getQuestionEffectiveness` | `IReportFilters` | `IQuestionEffectivenessResponse` | Soru analizi |
| `getAIHRAlignment` | `IReportFilters` | `IAIHRAlignmentResponse` | AI-HR uyumu |
| `getTimeTrends` | `IReportFilters, interval` | `ITimeTrendsResponse` | Zaman trendi |

---

## 📈 Rapor Detayları

### 1. Özet KPI Şeridi (`/summary`)

**Cache TTL:** 5 dakika

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "totalInterviews": 124,
    "evaluatedInterviews": 117,
    "pendingInterviews": 15,
    "completedApplications": 102,
    "favoriteRatio": 0.23,
    "avgOverallScore": 68.5,
    "avgTechnicalScore": 72.3,
    "avgCommunicationScore": 65.8,
    "avgInterviewDurationSec": 1845
  },
  "meta": {
    "filters": {...},
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Pozisyon Bazlı Dağılım (`/position-distribution`)

**Cache TTL:** 10 dakika

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "positionId": "pos123",
        "positionName": "Frontend Developer",
        "department": "Engineering",
        "distribution": {
          "highFit": 45,
          "mediumFit": 32,
          "lowFit": 18
        },
        "totalApplications": 95
      }
    ]
  }
}
```

### 3. Rol Yakınlığı Dağılımı (`/fit-distribution`)

**Cache TTL:** 10 dakika

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "roleFitBuckets": [
      { "range": "85-100 (Mükemmel)", "count": 12, "percentage": 15 },
      { "range": "70-85 (İyi)", "count": 28, "percentage": 35 },
      { "range": "50-70 (Orta)", "count": 25, "percentage": 31 },
      { "range": "30-50 (Orta-Düşük)", "count": 10, "percentage": 13 },
      { "range": "0-30 (Düşük)", "count": 5, "percentage": 6 }
    ],
    "avgScores": {
      "technical": 72.3,
      "communication": 65.8,
      "problemSolving": 68.2,
      "personality": 71.5
    },
    "skillScatter": [...]
  }
}
```

### 4. Soru Etkinliği Raporu (`/question-effectiveness`)

**Cache TTL:** 15 dakika

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "questionId": "q123",
        "questionText": "React hooks ile state yönetimini açıklayın",
        "interviewTitle": "Frontend Developer",
        "varianceScore": 0.78,
        "avgAnswerDurationSec": 185,
        "analysisCompletionRate": 0.95,
        "avgScore": 72.5,
        "responseCount": 48
      }
    ],
    "totalQuestions": 156
  }
}
```

### 5. AI-HR Uyum Analizi (`/ai-hr-alignment`)

**Cache TTL:** 10 dakika

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "overlapRatio": 0.76,
    "aiOnlyHigh": 15,
    "hrOnlyFavorite": 8,
    "bothHigh": 52,
    "totalEvaluated": 95,
    "alignmentTrend": [
      { "period": "2024-01", "ratio": 0.72 },
      { "period": "2024-02", "ratio": 0.76 }
    ]
  }
}
```

### 6. Zaman Bazlı Trendler (`/time-trends`)

**Cache TTL:** 10 dakika

**Query Parametreleri:**
- `interval`: `daily` | `weekly` | `monthly` (default: `weekly`)

**Response Örneği:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "period": "2024-W01",
        "applicationCount": 45,
        "avgScore": 68.5,
        "completionRate": 0.82
      }
    ],
    "interval": "weekly"
  }
}
```

---

## ⚡ Cache Stratejisi

### Cache Middleware

```typescript
// Cache-Control headers
res.set({
  'Cache-Control': `public, max-age=${maxAgeSec}`,
  'ETag': `"${Date.now()}"`,
  'Last-Modified': new Date().toUTCString()
});
```

### Endpoint Cache Süreleri

| Endpoint | Cache TTL | Açıklama |
|----------|-----------|----------|
| `/summary` | 5 dakika | Sık güncellenen KPI'lar |
| `/position-distribution` | 10 dakika | Orta sıklıkta değişen |
| `/fit-distribution` | 10 dakika | Aggregate skorlar |
| `/question-effectiveness` | 15 dakika | Daha az değişen |
| `/ai-hr-alignment` | 10 dakika | HR aksiyonlarına bağlı |
| `/time-trends` | 10 dakika | Tarihsel veri |

---

## 🛡️ Güvenlik

1. **Yetki Kontrolü**
   - Tüm endpoint'ler `authenticate` middleware ile korunur
   - Sadece HR kullanıcıları erişebilir

2. **Veri Gizliliği**
   - Aday detayları (isim, email) hiçbir response'da bulunmaz
   - Sadece anonymized aggregate veriler döner
   - GDPR/KVKK uyumlu

---

## 📈 Aggregate Query Örnekleri

### Skor Bucket Dağılımı

```typescript
const bucketAgg = await ApplicationModel.aggregate([
  { $match: matchStage },
  {
    $bucket: {
      groupBy: '$generalAIAnalysis.overallScore',
      boundaries: [0, 30, 50, 70, 85, 101],
      default: 'Other',
      output: { count: { $sum: 1 } }
    }
  }
]);
```

### Pozisyon Dağılımı

```typescript
const distribution = await ApplicationModel.aggregate([
  { $match: matchStage },
  {
    $lookup: {
      from: 'interviews',
      localField: 'interviewId',
      foreignField: '_id',
      as: 'interview'
    }
  },
  { $unwind: '$interview' },
  {
    $group: {
      _id: {
        interviewId: '$interviewId',
        title: '$interview.title'
      },
      totalApplications: { $sum: 1 },
      highFit: {
        $sum: { $cond: [{ $gte: ['$generalAIAnalysis.overallScore', 70] }, 1, 0] }
      }
    }
  }
]);
```

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Filtreli Sorgu | startDate + endDate | Filtrelenmiş sonuç |
| Cache Hit | Aynı sorgu tekrarı | 304 Not Modified |
| Boş Sonuç | Hiç data yok | Boş array döner |
| Yetkisiz Erişim | Token yok | 401 Unauthorized |

---

## 📝 Versiyon Notları

### v1.0 (Güncel)
- 6 temel rapor endpoint'i
- Ortak filtre mekanizması
- Cache middleware
- GDPR uyumlu anonymization

---

## 🔗 İlgili Dokümantasyon

- [Application Module](../application/README.md)
- [Interview Module](../interview/README.md)
- [AI Analysis Module](../aiAnalysis/README.md)
- [Candidates Module](../candidates/README.md)
    "avgTechnicalScore": 72.3,
    "avgCommunicationScore": 65.8,
    "avgInterviewDurationSec": 1420
  },
  "meta": {
    "filters": {},
    "generatedAt": "2024-12-15T10:30:00.000Z"
  }
}
```

### 2. Pozisyon Bazlı Dağılım

```
GET /api/reports/position-distribution
```

**Cache TTL:** 10 dakika

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "positionId": "691891616d5997b90413f2c1",
        "positionName": "Backend Developer",
        "department": "Engineering",
        "distribution": {
          "highFit": 18,
          "mediumFit": 42,
          "lowFit": 27
        },
        "totalApplications": 87
      }
    ]
  }
}
```

### 3. Rol Yakınlığı & Yetkinlik Dağılımı

```
GET /api/reports/fit-distribution
```

**Cache TTL:** 10 dakika

**Response:**
```json
{
  "success": true,
  "data": {
    "roleFitBuckets": [
      { "range": "0-30 (Düşük)", "count": 12, "percentage": 12 },
      { "range": "30-50 (Orta-Düşük)", "count": 25, "percentage": 25 },
      { "range": "50-70 (Orta)", "count": 35, "percentage": 35 },
      { "range": "70-85 (İyi)", "count": 20, "percentage": 20 },
      { "range": "85-100 (Mükemmel)", "count": 8, "percentage": 8 }
    ],
    "avgScores": {
      "technical": 72.3,
      "communication": 65.8,
      "problemSolving": 68.2,
      "personality": 70.5
    },
    "skillScatter": [
      { "communication": 0.7, "technical": 0.8, "problemSolving": 0.75 }
    ]
  }
}
```

### 4. Soru Bazlı Ayırt Edicilik

```
GET /api/reports/question-effectiveness
```

**Cache TTL:** 15 dakika

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "questionId": "q123",
        "questionText": "Problem solving approach",
        "interviewTitle": "Backend Developer",
        "varianceScore": 0.42,
        "avgAnswerDurationSec": 95,
        "analysisCompletionRate": 0.97,
        "avgScore": 72,
        "responseCount": 45
      }
    ],
    "totalQuestions": 25
  }
}
```

### 5. AI – HR Uyum Analizi

```
GET /api/reports/ai-hr-alignment
```

**Cache TTL:** 10 dakika

**Response:**
```json
{
  "success": true,
  "data": {
    "overlapRatio": 0.64,
    "aiOnlyHigh": 14,
    "hrOnlyFavorite": 9,
    "bothHigh": 27,
    "totalEvaluated": 50,
    "alignmentTrend": []
  }
}
```

### 6. Zaman Bazlı Trendler

```
GET /api/reports/time-trends?interval=weekly
```

**Ek Parametre:** `interval` = `daily` | `weekly` | `monthly`

**Cache TTL:** 30 dakika

**Response:**
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "period": "2024-W50",
        "avgOverallScore": 72.5,
        "favoriteRatio": 0.18,
        "applicationCount": 15,
        "completionRate": 0.87
      }
    ],
    "interval": "weekly",
    "summary": {
      "totalPeriods": 4,
      "avgScoreChange": 2.5,
      "peakPeriod": "2024-W51",
      "lowestPeriod": "2024-W49"
    }
  }
}
```

## Cache Stratejisi

- **In-Memory Cache:** Development ve küçük ölçekli deployment için
- **ETag Desteği:** Conditional GET ile 304 Not Modified
- **TTL:** Endpoint'e göre 5-30 dakika
- **Headers:**
  - `Cache-Control: public, max-age=XXX`
  - `ETag: "hash"`
  - `X-Cache: HIT|MISS`
  - `X-Cache-TTL: XXXs`

## Güvenlik

- Tüm endpoint'ler `authenticate` middleware ile korunur
- HR role gerektirir
- Candidate PII response'larda YOK

## Dosya Yapısı

```
src/modules/reports/
├── types/
│   └── reports.types.ts      # Tip tanımları
├── services/
│   └── reports.service.ts    # Aggregate query'ler
├── controllers/
│   └── reports.controller.ts # Request/Response handling
├── middlewares/
│   └── cache.middleware.ts   # In-memory cache
├── routes/
│   └── reports.routes.ts     # Route tanımları
└── README.md                 # Bu dosya
```
