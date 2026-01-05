# 🎯 Interview Module

## 📋 Genel Bakış

Interview modülü, video mülakat sisteminin çekirdek modülüdür. İK ekiplerinin mülakat setleri oluşturmasını, soruları yönetmesini, kişilik testleri eklemesini ve adaylarla paylaşılacak mülakat linklerini oluşturmasını sağlar.

## 🎯 Modülün Amaçları

- İK kullanıcılarının yeni mülakat setleri oluşturması
- Sorular, kişilik testi, link ve son başvuru tarihi yönetimi
- Mülakat durumu yönetimi (Draft → Published → Active → Completed)
- Aday erişimi için güvenli mülakat linkleri
- Dashboard istatistikleri sağlama
- AI Server için mülakat metadata'sı hazırlama

## 🏗️ Mimari Yapı

```
interview/
├── controllers/
│   └── interview.controller.ts     # HTTP endpoint handler'ları
├── dtos/
│   ├── createInterview.dto.ts      # Oluşturma validasyonu
│   ├── updateInterview.dto.ts      # Güncelleme validasyonu
│   └── dashboardData.dto.ts        # Dashboard response yapısı
├── models/
│   └── interview.model.ts          # MongoDB şeması
├── repositories/
│   └── interview.repository.ts     # DB işlemleri
├── routes/
│   └── interview.routes.ts         # Rota tanımları
├── services/
│   └── interview.service.ts        # İş mantığı
├── validators/
│   └── interview.validator.ts      # Custom validasyonlar
├── appointment/                     # Alt modül: Randevu yönetimi
│   ├── controllers/
│   ├── dtos/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   └── services/
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `application` | Bağımlı | Başvurular bu mülakata bağlı |
| `personalityTest` | Referans | Opsiyonel kişilik testi |
| `aiAnalysis` | Veri Sağlayıcı | Mülakat bilgileri AI'a gönderilir |

### Tüketen Modüller
| Modül | Kullanım |
|-------|----------|
| `application` | interviewId referansı |
| `candidates` | interviewIds listesi |
| `reports` | Mülakat istatistikleri |

---

## 📊 Veri Modeli

### IInterview Interface

```typescript
interface IInterview {
  _id: ObjectId;
  title: string;
  description?: string;
  expirationDate: Date;
  
  createdBy: {
    userId: ObjectId;                      // HR kullanıcı referansı
  };
  
  status: InterviewStatus;
  
  // Mülakat Tipi (AI Server için)
  type?: InterviewType;
  
  // Pozisyon Bilgileri (AI Server için)
  position?: {
    title: string;
    department?: string;
    competencyWeights?: {
      technical?: number;
      communication?: number;
      problem_solving?: number;
    };
    description?: string;
  };
  
  // Kişilik Testi
  personalityTestId?: ObjectId;
  stages: {
    personalityTest: boolean;
    questionnaire: boolean;
  };
  
  // Mülakat Linki
  interviewLink: {
    link: string;
    expirationDate?: Date;
  };
  
  // Sorular
  questions: IInterviewQuestion[];
  
  // AI Analiz Ayarları
  aiAnalysisSettings?: {
    useAutomaticScoring: boolean;
    gestureAnalysis: boolean;
    speechAnalysis: boolean;
    eyeContactAnalysis: boolean;
    tonalAnalysis: boolean;
    keywordMatchScore: number;
  };
  
  timestamps: { createdAt, updatedAt };
}
```

### IInterviewQuestion Interface

```typescript
interface IInterviewQuestion {
  _id?: ObjectId;
  questionText: string;
  expectedAnswer: string;
  explanation?: string;
  keywords: string[];
  order: number;
  duration: number;                        // Saniye cinsinden
  aiMetadata: {
    complexityLevel: 'low' | 'medium' | 'high' | 'intermediate' | 'advanced';
    requiredSkills: string[];
    keywordMatchScore?: number;
  };
}
```

### InterviewStatus Enum

```typescript
enum InterviewStatus {
  DRAFT = 'draft',           // Taslak - düzenlenebilir
  PUBLISHED = 'published',   // Yayınlandı - adaylar görebilir
  ACTIVE = 'active',         // Aktif - başvuru alınıyor
  COMPLETED = 'completed',   // Tamamlandı
  INACTIVE = 'inactive'      // Pasif
}
```

### InterviewType Enum

```typescript
enum InterviewType {
  ASYNC_VIDEO = 'async-video',   // Asenkron video mülakat
  LIVE_VIDEO = 'live-video',     // Canlı video mülakat
  AUDIO_ONLY = 'audio-only',     // Sadece ses
  TEXT_BASED = 'text-based'      // Yazılı mülakat
}
```

---

## 🔄 İş Akışları

### 1. Mülakat Oluşturma Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Mülakat Formu  │────▶│  Validasyon     │────▶│  Interview      │
│  (HR Dashboard) │     │  (DTO + Joi)    │     │  Oluştur        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────────────────────────────┐
                        │  İş Kuralları:                          │
                        │  - En az 1 soru zorunlu                 │
                        │  - Geçerli expiration date              │
                        │  - status: DRAFT (varsayılan)           │
                        │  - createdBy: JWT'den userId            │
                        └─────────────────────────────────────────┘
```

### 2. Mülakat Yayınlama Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  DRAFT Mülakat  │────▶│  Yayınlama      │────▶│  Kontroller     │
│                 │     │  İsteği         │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                            ┌───────────┼───────────┐
                                            │           │           │
                                      ❌ Soru Yok  ❌ Expired   ✅ OK
                                            │           │           │
                                            ▼           ▼           ▼
                                      400 Error   403 Error   ┌─────────────┐
                                                              │  Link       │
                                                              │  Oluştur    │
                                                              │  status:    │
                                                              │  PUBLISHED  │
                                                              └─────────────┘
```

### 3. Dashboard Veri Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Dashboard      │────▶│  getDashboard   │────▶│  Aggregate      │
│  İsteği         │     │  Data()         │     │  Queries        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌────────────────────────────────────────────┐
                        │  Response:                                  │
                        │  - applicationTrends[]                     │
                        │  - departmentApplications[]                │
                        │  - candidateProfiles[]                     │
                        │  - favoriteCandidates[]                    │
                        │  - interviewSummary                        │
                        └────────────────────────────────────────────┘
```

---

## 📡 API Endpoints

### Mülakat Yönetimi

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/interviews` | Yeni mülakat oluştur | HR |
| `GET` | `/api/interviews/all` | Tüm mülakatlar (Admin) | Admin |
| `GET` | `/api/interviews/my` | Kullanıcının mülakatları | HR |
| `GET` | `/api/interviews/dashboard` | Dashboard verileri | HR |
| `GET` | `/api/interviews/:id` | Mülakat detayı | HR |
| `PUT` | `/api/interviews/:id` | Mülakat güncelle | HR |
| `DELETE` | `/api/interviews/:id` | Mülakat sil (soft) | HR |

### Durum ve Link Yönetimi

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `PATCH` | `/api/interviews/:id/publish` | Yayınla | HR |
| `PATCH` | `/api/interviews/:id/link` | Link yenile | HR |

---

## 🔧 Service Metodları

### InterviewService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `createInterview` | `CreateInterviewDTO, userId` | `IInterview` | Yeni mülakat oluştur |
| `getInterviewById` | `interviewId` | `IInterview` | Mülakat detayı |
| `getAllInterviews` | - | `IInterview[]` | Tüm mülakatlar (Admin) |
| `getInterviewsByUser` | `userId` | `IInterview[]` | Kullanıcının mülakatları |
| `updateInterview` | `id, updateData` | `IInterview` | Mülakat güncelle |
| `publishInterview` | `interviewId` | `IInterview` | Yayınla + link oluştur |
| `softDeleteInterview` | `interviewId` | `void` | Soft delete |
| `deleteInterview` | `interviewId` | `void` | Hard delete |
| `getDashboardData` | `userId` | `DashboardDataDTO` | Dashboard verileri |

---

## 📦 DTO Yapıları

### CreateInterviewDTO

```typescript
interface CreateInterviewDTO {
  title: string;
  description?: string;
  expirationDate: string;                  // ISO date
  type?: InterviewType;
  position?: {
    title: string;
    department?: string;
    competencyWeights?: {
      technical?: number;
      communication?: number;
      problem_solving?: number;
    };
    description?: string;
  };
  personalityTestId?: string;
  stages?: {
    personalityTest?: boolean;
    questionnaire?: boolean;
  };
  questions: Array<{
    questionText: string;
    expectedAnswer: string;
    explanation?: string;
    keywords: string[];
    order: number;
    duration: number;
    aiMetadata: {
      complexityLevel: string;
      requiredSkills: string[];
    };
  }>;
}
```

### DashboardDataDTO

```typescript
interface DashboardDataDTO {
  applicationTrends: Array<{ date: string; count: number }>;
  departmentApplications: Array<{ department: string; count: number }>;
  candidateProfiles: Array<{ experience: string; count: number }>;
  favoriteCandidates: Array<{ id: string; name: string; position: string; score: number }>;
  interviewSummary: { totalInterviews: number; publishedCount: number };
}
```

---

## 🛡️ İş Kuralları

### Oluşturma Kuralları
1. En az 1 soru zorunlu
2. Geçerli expiration date formatı
3. status otomatik olarak DRAFT

### Güncelleme Kuralları
1. Sadece owner güncelleyebilir
2. PUBLISHED mülakatların core alanları (questions, title, personalityTestId) değiştirilemez
3. Soru listesi boş yapılamaz

### Yayınlama Kuralları
1. Sadece DRAFT mülakatlar yayınlanabilir
2. En az 1 soru olmalı
3. Süresi dolmuş mülakat yayınlanamaz
4. Yayınlandığında otomatik link oluşturulur

### Erişim Kuralları
1. DRAFT mülakatları sadece owner görebilir
2. Admin tüm mülakatları görebilir
3. Adaylar sadece PUBLISHED/ACTIVE mülakatları görebilir

---

## 🔒 Güvenlik

1. **Yetki Kontrolü**
   - `authenticate` middleware zorunlu
   - Owner kontrolü tüm write işlemlerinde
   - Admin özel endpoint'ler için rol kontrolü

2. **Gizlilik**
   - DRAFT mülakatların varlığı 3. kişilere gizli (404 döner)
   - createdBy.userId populate edilir ama hassas bilgiler filtrelenir

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Sorusuz Mülakat | questions: [] | 400 Bad Request |
| DRAFT Görüntüleme | Başka kullanıcı | 404 Not Found |
| Published Güncelleme | questions değiştir | 400 Bad Request |
| Expired Yayınlama | Süresi geçmiş | 403 Forbidden |
| Link Oluşturma | publish() çağrısı | interviewLink set |

---

## 📝 Versiyon Notları

### v2.0 (Güncel)
- AI Server entegrasyonu için type ve position alanları
- aiMetadata soru bazında complexity ve skills
- Dashboard endpoint'i
- Gelişmiş iş kuralları

### v1.0
- Temel CRUD işlemleri
- Durum yönetimi
- Link oluşturma

---

## 🔗 İlgili Dokümantasyon

- [Application Module](../application/README.md)
- [AI Analysis Module](../aiAnalysis/README.md)
- [Personality Test Module](../personalityTest/README.md)

İstek validasyonu yapılır (validateRequest()).

📂 Uç Noktalar (API Routes)

Metot URL Açıklama
POST /api/interview/create Yeni mülakat oluştur.
GET /api/interview/all (Admin) Tüm mülakatları getir.
GET /api/interview/my Kullanıcının kendi mülakatlarını getir.
GET /api/interview/:id Belirli bir mülakatı getir.
PUT /api/interview/:id Mülakat bilgilerini güncelle.
DELETE /api/interview/:id Mülakatı soft delete yap.
PUT /api/interview/:id/status Mülakatın yayın durumunu değiştir.
PATCH /api/interview/:id/link Mülakat katılım linki oluştur.
PATCH /api/interview/:id/questions Mülakatın soru listesini güncelle.
PATCH /api/interview/:id/personality-test Mülakata kişilik testi ekle/sil.
📑 Kullanılan Yapılar

Yapı Açıklama
Mongoose Interview modeli ile MongoDB veritabanı işlemleri yapılır.
Express.js API rotaları ve controller yapısı yönetilir.
Joi Validation createInterviewSchema, updateInterviewSchema ile body validasyonu yapılır.
Middleware authenticate, validateRequest, asyncHandler ile güvenlik ve hata yönetimi sağlanır.
🔄 Statü Geçiş Kuralları
Taslak (draft) → Yayınlandı (published) yapılabilir.

Yayınlandı (published) → İnaktif (inactive) yapılabilir.

Diğer statü geçişleri reddedilir.

🚀 İş Akışı Örneği
mermaid
Kopyala
Düzenle
sequenceDiagram
İK Kullanıcı ->> Sunucu: POST /api/interview/create
Sunucu ->> DB: Yeni mülakat kaydı oluşturur (taslak olarak)
İK Kullanıcı ->> Sunucu: PATCH /api/interview/:id/questions
Sunucu ->> DB: Soruları günceller
İK Kullanıcı ->> Sunucu: PUT /api/interview/:id/status (published)
Sunucu ->> DB: Mülakatı yayınlar
Aday ->> Sunucu: GET /api/public/interview/:id
Sunucu -->> Aday: Yayınlanmış mülakat bilgileri
🧹 Kurallar ve Standartlar
Her kullanıcı sadece kendi oluşturduğu mülakatlar üzerinde işlem yapabilir.

Admin kullanıcılar tüm mülakatlara erişebilir.

Soft Delete yapılır: Mülakatlar silindiğinde veri kaybı yaşanmaz.

Katılım Linki: Her mülakata özel URL üretilir.

Kişilik Testi: Mülakata opsiyonel olarak eklenebilir.

📦 Önemli Bağımlılıklar
axios – Yok (şu anda sadece backend içi işlemler)

mongoose – Model işlemleri için.

joi – Body validasyon için.

dotenv – Ortam değişkenleri için.

✅ Özet
Interview Modülü, İK tarafı için profesyonel, esnek ve güvenli mülakat yönetimi sağlar.
Adaylara doğru sorularla ulaşılmasını ve mülakat sürecinin kontrollü bir şekilde ilerlemesini destekler.

İlerleyen geliştirmeler:

Mülakata özel zamanlayıcılar

Gerçek zamanlı mülakat analizi

Çoklu dil destekli soru havuzları

Admin raporlama panelleri
