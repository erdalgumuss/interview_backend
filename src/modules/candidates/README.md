# 👥 Candidates Module (Aday Havuzu)

## 📋 Genel Bakış

Candidates modülü, aday merkezli yetenek havuzu yönetimini sağlar. Tüm başvurulardan bağımsız olarak adayları email bazında birleştirir, geçmiş mülakat performanslarını izler ve İK ekibine kapsamlı aday profilleri sunar.

## 🎯 Modülün Amaçları

- Email bazlı unique aday kaydı oluşturmak
- Farklı mülakatlardan gelen aynı adayları birleştirmek
- Adayların mülakat geçmişini ve skor trendlerini izlemek
- İK ekibine favoriler, notlar ve durum yönetimi sağlamak
- Aday verilerini reports modülüne expose etmeden aggregate istatistikler sunmak

## 🏗️ Mimari Yapı

```
candidates/
├── controllers/
│   └── candidate.controller.ts     # Endpoint handler'ları
├── models/
│   └── candidate.model.ts          # MongoDB şeması
├── repositories/
│   └── candidate.repository.ts     # DB işlemleri
├── routes/
│   └── candidate.routes.ts         # Rota tanımları
├── services/
│   └── candidate.service.ts        # İş mantığı
├── types/
│   └── candidate.types.ts          # Tip tanımları
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `application` | Veri Kaynağı | Başvuru verilerinden senkronize |
| `interview` | Veri Kaynağı | Mülakat bilgilerini okur |
| `aiAnalysis` | Veri Kaynağı | Skor verilerini okur |

### Tasarım Prensipleri

- ✅ Email bazlı unique aday kaydı
- ✅ Soft status (silme yok, arşivleme var)
- ✅ Aggregate skorları yeniden hesaplamaz, mevcut analizlerden okur
- ✅ Interview'ler ve Application'lar korunur
- ✅ Merge işleminde source candidate archived edilir
- ✅ Candidate-level veri expose edilmez (reports için)

---

## 📊 Veri Modeli

### ICandidate Interface

```typescript
interface ICandidate {
  _id: ObjectId;
  
  // Temel Bilgiler
  primaryEmail: string;                    // Unique, lowercase
  emailAliases: Array<{
    email: string;
    mergedFrom?: ObjectId;
    mergedAt?: Date;
  }>;
  name: string;
  surname: string;
  phone?: string;
  
  // Durum (Soft - Silme Yok)
  status: CandidateStatus;
  
  // İK İşlemleri
  isFavorite: boolean;
  favoritedBy?: ObjectId;
  favoritedAt?: Date;
  notes: Array<{
    authorId: ObjectId;
    authorName: string;
    content: string;
    createdAt: Date;
  }>;
  
  // Skor Özeti (Mevcut Analizlerden)
  scoreSummary: {
    avgOverallScore?: number;
    avgTechnicalScore?: number;
    avgCommunicationScore?: number;
    avgProblemSolvingScore?: number;
    avgPersonalityScore?: number;
    lastScore?: number;
    lastScoreDate?: Date;
    totalInterviews: number;
    completedInterviews: number;
  };
  
  // İlişkili Kayıtlar
  applicationIds: ObjectId[];
  interviewIds: ObjectId[];
  
  // Tarihler
  lastInterviewDate?: Date;
  firstInterviewDate?: Date;
  
  // Merge Bilgisi
  mergedInto?: ObjectId;
  mergedAt?: Date;
  
  timestamps: { createdAt, updatedAt };
}
```

### CandidateStatus Enum

```typescript
type CandidateStatus = 
  | 'active'      // Aktif aday
  | 'reviewed'    // İncelendi
  | 'shortlisted' // Kısa listeye alındı
  | 'archived'    // Arşivlendi
  | 'rejected';   // Reddedildi
```

---

## 🔄 İş Akışları

### 1. Application → Candidate Senkronizasyonu

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Yeni Başvuru   │────▶│  Email Kontrolü │────▶│  Candidate      │
│  (Application)  │     │  (Mevcut mu?)   │     │  Var mı?        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    │                   │                   │
                               ❌ Yok              ✅ Var            📧 Alias'ta
                                    │                   │                   │
                                    ▼                   ▼                   ▼
                        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                        │  Yeni Candidate │  │  applicationIds │  │  Merge İşlemi   │
                        │  Oluştur        │  │  Güncelle       │  │  Gerekli mi?    │
                        └─────────────────┘  └─────────────────┘  └─────────────────┘
                                                        │
                                                        ▼
                                            ┌─────────────────┐
                                            │  Skor Özeti     │
                                            │  Güncelle       │
                                            └─────────────────┘
```

### 2. Duplicate Merge Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Duplicate      │────▶│  Potansiyel     │────▶│  Merge Onay     │
│  Tespit         │     │  Eşleşmeler     │     │  (İK Kararı)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌────────────────────────────────────────────┐
                        │  Source Candidate → Target Candidate       │
                        │  - applicationIds birleştir                │
                        │  - interviewIds birleştir                  │
                        │  - notes birleştir                         │
                        │  - emailAliases ekle                       │
                        │  - source.mergedInto = target._id          │
                        │  - source.status = 'archived'              │
                        └────────────────────────────────────────────┘
```

---

## 📡 API Endpoints

### Aday Yönetimi

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/candidates` | Aday havuzunu listele/filtrele | HR |
| `GET` | `/api/candidates/positions` | Pozisyon listesi (filtreleme için) | HR |
| `GET` | `/api/candidates/:candidateId` | Aday detayı | HR |
| `GET` | `/api/candidates/:candidateId/interviews` | Mülakat geçmişi | HR |
| `GET` | `/api/candidates/:candidateId/score-trend` | Skor trendi | HR |

### İK Etkileşimleri

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/candidates/:candidateId/notes` | Not ekle | HR |
| `PATCH` | `/api/candidates/:candidateId/status` | Durum güncelle | HR |
| `POST` | `/api/candidates/:candidateId/favorite` | Favorilere ekle/çıkar | HR |

### Veri Bütünlüğü

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/candidates/:candidateId/potential-duplicates` | Olası duplicate'ler | HR |
| `POST` | `/api/candidates/:candidateId/merge/:targetId` | Kayıtları birleştir | HR |

---

## 🔍 Filtreleme Parametreleri

### Query Parametreleri

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `positionIds` | string | Pozisyon ID'leri (virgülle ayrılmış) |
| `interviewIds` | string | Mülakat ID'leri (virgülle ayrılmış) |
| `minInterviewCount` | number | Minimum mülakat sayısı |
| `maxInterviewCount` | number | Maksimum mülakat sayısı |
| `lastInterviewAfter` | ISO date | Son mülakat sonrası |
| `lastInterviewBefore` | ISO date | Son mülakat öncesi |
| `minOverallScore` | number | Minimum genel skor |
| `maxOverallScore` | number | Maksimum genel skor |
| `minTechnicalScore` | number | Minimum teknik skor |
| `minCommunicationScore` | number | Minimum iletişim skoru |
| `onlyFavorites` | boolean | Sadece favoriler |
| `status` | string | Durum (active,reviewed,shortlisted,archived,rejected) |
| `search` | string | Ad/soyad/email araması |
| `sortBy` | string | Sıralama (lastInterview, score, createdAt, name) |
| `sortOrder` | string | Sıralama yönü (asc, desc) |
| `page` | number | Sayfa numarası (default: 1) |
| `pageSize` | number | Sayfa boyutu (default: 20) |

---

## 🔧 Service Metodları

### CandidateService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `syncFromApplication` | `applicationId` | `ICandidate` | Başvurudan senkronize |
| `listCandidates` | `ICandidateFilters` | `ICandidateListResponse` | Filtrelenmiş liste |
| `getCandidateDetail` | `candidateId` | `ICandidateDetailResponse` | Aday detayı |
| `getCandidateInterviews` | `candidateId` | `ICandidateInterviewItem[]` | Mülakat geçmişi |
| `getScoreTrend` | `candidateId` | `IScoreTrendResponse` | Skor grafiği |
| `getPositions` | - | `Position[]` | Pozisyon listesi |
| `addNote` | `candidateId, userId, content` | `ICandidateNote` | Not ekle |
| `updateStatus` | `candidateId, status` | `ICandidate` | Durum güncelle |
| `addToFavorites` | `candidateId, userId` | `boolean` | Favoriye ekle |
| `removeFromFavorites` | `candidateId` | `boolean` | Favoriden çıkar |
| `findPotentialDuplicates` | `candidateId` | `IPotentialDuplicate[]` | Duplicate bul |
| `mergeCandidates` | `sourceId, targetId, userId` | `IMergeResponse` | Birleştir |

---

## 📦 Response Yapıları

### Aday Listesi Response

```typescript
interface ICandidateListResponse {
  candidates: Array<{
    _id: string;
    name: string;
    surname: string;
    email: string;
    status: CandidateStatus;
    isFavorite: boolean;
    totalInterviews: number;
    lastInterviewDate?: Date;
    lastScore?: number;
    avgOverallScore?: number;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

### Skor Trendi Response

```typescript
interface IScoreTrendResponse {
  candidateId: string;
  trends: Array<{
    interviewId: string;
    interviewTitle: string;
    date: Date;
    overallScore?: number;
    technicalScore?: number;
    communicationScore?: number;
  }>;
}
```

---

## 🔒 Güvenlik

1. **Yetki Kontrolü**
   - Tüm endpoint'ler `authenticate` middleware ile korunur
   - Sadece HR yetkilileri erişebilir

2. **Veri Gizliliği**
   - Individual aday verileri reports'a expose edilmez
   - Sadece aggregate istatistikler döner

3. **Soft Delete**
   - Adaylar silinmez, arşivlenir
   - Merge işlemlerinde kaynak kayıt korunur

---

## 📈 Performans

### Index'ler

```typescript
CandidateSchema.index({ primaryEmail: 1 }, { unique: true });
CandidateSchema.index({ 'emailAliases.email': 1 });
CandidateSchema.index({ status: 1 });
CandidateSchema.index({ isFavorite: 1 });
CandidateSchema.index({ lastInterviewDate: -1 });
CandidateSchema.index({ 'scoreSummary.avgOverallScore': -1 });
```

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Yeni Başvuru Sync | İlk başvuru yapan aday | Yeni candidate oluşur |
| Tekrar Başvuru | Aynı email ile başvuru | applicationIds güncellenir |
| Duplicate Merge | İki aday birleştirilir | Source archived olur |
| Favori Toggle | Favoriye ekle/çıkar | isFavorite toggle edilir |
| Not Ekleme | İK notu ekle | notes array'e eklenir |

---

## 📝 Versiyon Notları

### v1.0 (Güncel)
- Email bazlı unique aday kaydı
- Application senkronizasyonu
- Skor özeti hesaplama
- Favoriler ve not yönetimi
- Duplicate merge
- Kapsamlı filtreleme

---

## 🔗 İlgili Dokümantasyon

- [Application Module](../application/README.md)
- [Interview Module](../interview/README.md)
- [Reports Module](../reports/README.md)
      "_id": "...",
      "name": "Ahmet",
      "surname": "Yılmaz",
      "fullName": "Ahmet Yılmaz",
      "primaryEmail": "ahmet@email.com",
      "status": "active",
      "isFavorite": true,
      "scoreSummary": {
        "avgOverallScore": 85,
        "totalInterviews": 3
      },
      "lastInterviewDate": "2024-12-10T10:00:00Z",
      "lastInterviewTitle": "Backend Developer"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### 2. Aday Detay

```
GET /api/candidates/:candidateId
```

### 3. Mülakat Geçmişi

```
GET /api/candidates/:candidateId/interviews
```

### 4. Skor Trendi

```
GET /api/candidates/:candidateId/score-trend
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "date": "2024-11-01T10:00:00Z",
        "interviewTitle": "Junior Developer",
        "overallScore": 72
      },
      {
        "date": "2024-12-01T10:00:00Z",
        "interviewTitle": "Mid Developer",
        "overallScore": 85
      }
    ],
    "summary": {
      "firstScore": 72,
      "lastScore": 85,
      "avgScore": 78.5,
      "scoreChange": 13,
      "trend": "improving"
    }
  }
}
```

### 5. Favori İşlemleri

```
POST /api/candidates/:candidateId/favorite
DELETE /api/candidates/:candidateId/favorite
```

### 6. Not İşlemleri

```
GET /api/candidates/:candidateId/notes
POST /api/candidates/:candidateId/notes
```

**Body (POST):**
```json
{
  "content": "Aday ile görüşme yapıldı, ikinci tur için uygun."
}
```

### 7. Durum Güncelleme (Soft)

```
PATCH /api/candidates/:candidateId/status
```

**Body:**
```json
{
  "status": "shortlisted"
}
```

**Geçerli Durumlar:**
- `active` - Aktif
- `reviewed` - İncelendi
- `shortlisted` - Kısa listede
- `archived` - Arşivlendi
- `rejected` - Reddedildi

### 8. Duplicate Detection (Read-only)

```
GET /api/candidates/:candidateId/potential-duplicates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "candidateId": "...",
      "name": "Ahmet",
      "surname": "Yilmaz",
      "email": "a.yilmaz@email.com",
      "matchReason": "email_similar",
      "matchScore": 85
    }
  ]
}
```

### 9. Merge (HR Onayı ile)

```
POST /api/candidates/:candidateId/merge
```

**Body:**
```json
{
  "targetCandidateId": "..."
}
```

**İşlem:**
- Source candidate'ın interview'leri target'a aktarılır
- Source candidate'ın email'i alias olarak eklenir
- Source candidate `archived` durumuna alınır
- Hiçbir veri silinmez

## Candidate Model

```typescript
interface ICandidate {
  primaryEmail: string;       // Unique
  emailAliases: string[];     // Merge'den gelen
  name: string;
  surname: string;
  status: CandidateStatus;    // Soft status
  isFavorite: boolean;
  notes: ICandidateNote[];
  scoreSummary: {
    avgOverallScore?: number;
    avgTechnicalScore?: number;
    totalInterviews: number;
    completedInterviews: number;
  };
  applicationIds: ObjectId[]; // İlişkili başvurular
  interviewIds: ObjectId[];   // İlişkili mülakatlar
  lastInterviewDate?: Date;
  mergedInto?: ObjectId;      // Merge edilmişse
}
```

## Application Senkronizasyonu

Her Application oluşturulduğunda veya güncellendiğinde:

1. Email'e göre Candidate aranır
2. Yoksa yeni Candidate oluşturulur
3. Varsa applicationIds ve interviewIds güncellenir
4. Skor özeti mevcut Application'lardan hesaplanır (yeni analiz yapılmaz)

## Dosya Yapısı

```
src/modules/candidates/
├── models/
│   └── candidate.model.ts     # Mongoose model
├── types/
│   └── candidate.types.ts     # Tip tanımları
├── services/
│   └── candidate.service.ts   # Business logic
├── controllers/
│   └── candidate.controller.ts # Request handling
├── routes/
│   └── candidate.routes.ts    # Route tanımları
└── README.md                  # Bu dosya
```

## Güvenlik

- Tüm endpoint'ler `authenticate` middleware ile korunur
- Candidate bilgisi sadece yetkili HR'lar tarafından görülebilir
- Soft delete: Hiçbir kayıt fiziksel olarak silinmez
