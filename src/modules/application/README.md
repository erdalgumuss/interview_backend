# 📋 Application Module

## 📋 Genel Bakış

Application modülü, mülakat başvuru sürecinin tamamını yönetir. Adayların başvuru yapması, telefon doğrulaması (OTP), kişisel bilgilerin güncellenmesi, video yanıtlarının kaydedilmesi ve İK tarafından başvuruların incelenmesini kapsar.

## 🎯 Modülün Amaçları

- Adayların mülakat başvurusu yapmasını sağlamak
- Telefon doğrulaması (OTP) ile başvuruları güvenceye almak
- Adayın eğitim, deneyim ve yetenek bilgilerini toplamak
- Video yanıtlarının başvuruya eklenmesini yönetmek
- Kişilik testi yanıtlarının kaydedilmesini sağlamak
- İK yetkililerinin başvuruları güvenli şekilde inceleyebilmesini sağlamak
- Başvuru durumu yönetimi ve filtreleme

## 🏗️ Mimari Yapı

```
application/
├── controllers/
│   ├── application.controller.ts   # İK tarafı endpoint'leri
│   └── candidate.controller.ts     # Aday tarafı endpoint'leri
├── dtos/
│   ├── createApplication.dto.ts    # Başvuru oluşturma validasyonu
│   ├── interviewDetails.dto.ts     # Mülakat detayları
│   ├── otpVerify.dto.ts            # OTP doğrulama
│   ├── personalInfo.dto.ts         # Kişisel bilgiler
│   ├── personalityTest.dto.ts      # Kişilik testi yanıtları
│   ├── publicInterview.dto.ts      # Public mülakat bilgileri
│   ├── startApplication.dto.ts     # Başvuru başlatma
│   ├── supportRequest.dto.ts       # Destek talepleri
│   ├── updateApplicationStatus.dto.ts # Durum güncelleme
│   ├── updateCandidate.dto.ts      # Aday güncelleme
│   └── videoResponse.dto.ts        # Video yanıtı
├── models/
│   └── application.model.ts        # MongoDB şeması
├── repositories/
│   ├── application.repository.ts   # İK sorgular
│   └── candidate.repository.ts     # Aday sorgular
├── routes/
│   ├── application.routes.ts       # İK rotaları
│   └── candidate.routes.ts         # Aday rotaları (public)
├── services/
│   ├── application.service.ts      # İK iş mantığı
│   └── candidate.service.ts        # Aday iş mantığı
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `interview` | Referans | Mülakatı başvuruya bağlar |
| `video` | Alt Kaynak | VideoResponse modelini oluşturur |
| `aiAnalysis` | Tetikleyici | Tüm videolar yüklenince AI analizi başlatır |
| `candidates` | Senkronizasyon | Candidate Pool'a aday bilgisi senkronlar |
| `personalityTest` | Referans | Kişilik testi sonuçlarını kaydeder |

### Dış Bağımlılıklar
| Servis | Kullanım | Açıklama |
|--------|----------|----------|
| BullMQ | Queue | AI analizi için asenkron kuyruk |
| SMS Gateway | OTP | Telefon doğrulama kodları |

---

## 📊 Veri Modeli

### IApplication Interface

```typescript
interface IApplication {
  _id: ObjectId;
  interviewId: ObjectId;           // Bağlı mülakat
  
  // Aday Profili
  candidate: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    phoneVerified: boolean;
    verificationCode?: string;     // OTP (hidden)
    verificationExpiresAt?: Date;
    kvkkConsent?: boolean;
  };
  
  // Kariyer Bilgileri
  education: Array<{
    school: string;
    degree: string;
    graduationYear: number;
  }>;
  
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    responsibilities: string;
  }>;
  
  skills: {
    technical: string[];
    personal: string[];
    languages: string[];
  };
  
  documents: {
    resume?: string;
    certificates?: string[];
    socialMediaLinks?: string[];
  };
  
  // Durum Yönetimi
  status: ApplicationStatus;
  
  // Kişilik Testi
  personalityTestResults?: {
    testId: ObjectId;
    completed: boolean;
    scores?: {
      openness?: number;
      conscientiousness?: number;
      extraversion?: number;
      agreeableness?: number;
      neuroticism?: number;
    };
    personalityFit?: number;
  };
  
  // AI Analiz Sonuçları
  aiAnalysisResults: ObjectId[];
  latestAIAnalysisId?: ObjectId;
  generalAIAnalysis?: {
    overallScore?: number;
    technicalSkillsScore?: number;
    communicationScore?: number;
    problemSolvingScore?: number;
    personalityMatchScore?: number;
    strengths?: string[];
    areasForImprovement?: Array<{ area, recommendedAction }>;
    recommendation?: string;
  };
  
  // Video Yanıtları
  responses: Array<{
    questionId: ObjectId;
    videoUrl?: string;
    textAnswer?: string;
    duration?: number;
  }>;
  
  // Diğer
  allowRetry: boolean;
  maxRetryAttempts?: number;
  retryCount?: number;
  supportRequests: Array<{ timestamp, message }>;
  
  timestamps: { createdAt, updatedAt };
}
```

### ApplicationStatus Enum

```typescript
type ApplicationStatus = 
  | 'pending'                    // Başvuru bekliyor
  | 'awaiting_video_responses'   // Video bekleniyor
  | 'in_progress'                // İşlemde
  | 'awaiting_ai_analysis'       // AI analizi bekleniyor
  | 'analysis_completed'         // Analiz tamamlandı
  | 'completed'                  // Tamamlandı
  | 'rejected'                   // Reddedildi
  | 'accepted';                  // Kabul edildi
```

---

## 🔄 İş Akışları

### 1. Aday Başvuru Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Public Form    │────▶│  createApplication │──▶│   OTP Gönder    │
│  (GET interview)│     │  status: pending    │   │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Detay Güncelle │◀────│  Token Oluştur  │◀────│   OTP Doğrula   │
│  (education,    │     │  (JWT Candidate)│     │   phoneVerified │
│  experience)    │     └─────────────────┘     └─────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Video Yükle    │────▶│  Tüm Videolar   │────▶│  AI Analizi     │
│  (her soru için)│     │  Yüklendi mi?   │     │  Başlat         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Kişilik Testi  │
                                                │  (Opsiyonel)    │
                                                └─────────────────┘
```

### 2. İK Başvuru Yönetimi Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Başvuru Liste  │────▶│  Filtrele       │────▶│  Detay Görüntüle│
│  (getAllApps)   │     │  (status, score)│     │  (getById)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Durum Güncelle │
                                                │  (accept/reject)│
                                                └─────────────────┘
```

---

## 📡 API Endpoints

### Aday (Public) Endpoints

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/public/interview/:interviewId` | Mülakat bilgilerini getir | - |
| `POST` | `/api/public/` | Başvuru oluştur, OTP gönder | - |
| `POST` | `/api/public/verifyOtp` | OTP doğrula, token al | - |
| `POST` | `/api/public/resendOtp` | Yeni OTP gönder | - |
| `PUT` | `/api/public/update` | Aday bilgilerini güncelle | Candidate |
| `POST` | `/api/public/video/response` | Video yanıtı kaydet | Candidate |
| `POST` | `/api/public/personality-test/response` | Kişilik testi yanıtı | Candidate |

### İK (Protected) Endpoints

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/api/applications/` | Başvuruları listele/filtrele | HR |
| `GET` | `/api/applications/:id` | Başvuru detayı | HR |
| `PATCH` | `/api/applications/:id/status` | Durum güncelle | HR |

---

## 🔧 Service Metodları

### CandidateService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `getPublicInterview` | `interviewId` | `GetPublicInterviewDTO` | Public mülakat bilgisi |
| `createApplication` | `CreateApplicationDTO` | `IApplication` | Başvuru oluştur + OTP |
| `verifyOtp` | `VerifyOtpDTO` | `{ token, application }` | OTP doğrula |
| `resendOtp` | `applicationId` | `{ expiresAt }` | Yeni OTP gönder |
| `updateCandidateDetails` | `UpdateCandidateDTO` | `IApplication` | Aday bilgisi güncelle |
| `saveVideoResponse` | `VideoResponseDTO, applicationId` | `IApplication` | Video yanıtı kaydet |
| `savePersonalityTestResponse` | `PersonalityTestResponseDTO, applicationId` | `IApplication` | Test yanıtı kaydet |

### ApplicationService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `getApplicationById` | `id, userId` | `IApplication` | Başvuru detayı (yetkili) |
| `getAllApplications` | `filters, userId` | `{ applications, total, page }` | Filtrelenmiş liste |
| `updateApplicationStatus` | `id, status, userId` | `IApplication` | Durum güncelle |

---

## 📦 DTO Yapıları

### CreateApplicationDTO

```typescript
interface CreateApplicationDTO {
  interviewId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  kvkkConsent: boolean;
}
```

### UpdateCandidateDTO

```typescript
interface UpdateCandidateDTO {
  applicationId: string;
  education?: Array<{ school, degree, graduationYear }>;
  experience?: Array<{ company, position, duration, responsibilities }>;
  skills?: { technical[], personal[], languages[] };
}
```

### VideoResponseDTO

```typescript
interface VideoResponseDTO {
  questionId: string;
  videoUrl: string;
  duration: number;
  textAnswer?: string;
  aiAnalysisRequired?: boolean;
}
```

---

## 🛡️ Middleware'ler

| Middleware | Kullanım | Açıklama |
|------------|----------|----------|
| `authenticateCandidate` | Aday endpoint'leri | JWT ile aday doğrulama |
| `authenticate` | İK endpoint'leri | HR kullanıcı doğrulama |
| `rateLimitMiddleware` | Public endpoint'ler | DDoS koruması |
| `validateRequest` | Tüm POST/PUT | DTO validasyonu |

### Rate Limit Ayarları

| Endpoint | Window | Max Request |
|----------|--------|-------------|
| `POST /` (başvuru) | 10 dakika | 3 |
| `POST /verifyOtp` | 5 dakika | 5 |
| `POST /resendOtp` | 5 dakika | 3 |

---

## 🔐 Güvenlik

1. **OTP Güvenliği**
   - 6 haneli rastgele kod
   - 10 dakika geçerlilik
   - Kullanıldıktan sonra silinir
   - Rate limiting ile koruma

2. **Yetki Kontrolü**
   - İK sadece kendi mülakatlarındaki başvuruları görebilir
   - Aday token'ı ile kimlik doğrulama
   - KVKK onayı zorunlu

3. **Veri Gizliliği**
   - `verificationCode` select: false ile gizli
   - Hassas bilgiler log'lanmaz

---

## 📈 Önemli İş Kuralları

1. **Aynı E-posta Kontrolü**: Bir aday aynı mülakata birden fazla başvuramaz
2. **Mülakat Durumu**: Sadece `published` veya `active` mülakata başvuru yapılabilir
3. **Süresi Dolmuş Mülakat**: Expired mülakata başvuru engellenir
4. **Video Tamamlama**: Tüm sorular cevaplanınca AI analizi otomatik başlar
5. **Candidate Pool Sync**: Her başvuru candidate havuzuna senkronize edilir

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Başarılı Başvuru | Geçerli form + OTP | Token döner |
| Duplicate Başvuru | Aynı email + interview | 400 Error |
| Expired OTP | 10 dk sonra doğrulama | Yeni OTP gönderilir |
| Yetkisiz Erişim | Başka HR'ın başvurusu | 403 Forbidden |
| Video Upload | Tüm sorular cevaplandı | AI analizi başlar |

---

## 📝 Versiyon Notları

### v2.0 (Güncel)
- Video yanıtı kaydetme eklendi
- Kişilik testi entegrasyonu
- Candidate Pool senkronizasyonu
- AI analizi tetikleme

### v1.0
- Temel başvuru akışı
- OTP doğrulama
- İK başvuru görüntüleme

---

## 🔗 İlgili Dokümantasyon

- [AI Analysis Module](../aiAnalysis/README.md)
- [Interview Module](../interview/README.md)
- [Candidates Module](../candidates/README.md)
- [Video Module](../video/README.md)

🧩 Modülde Kullanılan Yapılar

Yapı Açıklama
OTP Yönetimi Başvuru yapan adaylara OTP kodu gönderilir, doğrulanana kadar sınırlı işlem yapılabilir.
JWT Authentication Adaylar ve İK kullanıcıları JWT token ile doğrulanır.
Rate Limiting OTP istekleri ve başvurular belirli aralıklarla sınırlandırılır. (Spam koruması)
DTO Validasyonları Gelen istekler şema bazlı kontrol edilir.
Role-Based Access Control Adaylar sadece kendi bilgilerine, İK kullanıcıları sadece kendi mülakatlarına erişir.
🔐 Güvenlik Katmanları
OTP kodları belirli bir süre sonra geçersiz olur (örn. 10 dakika).

Her başvuru için yalnızca 1 aktif OTP bulunur.

Başvurular sadece doğrulanmış adaylar tarafından güncellenebilir.

Başvurulara sadece ilgili mülakatı oluşturmuş İK personeli erişebilir.

Rate limit middleware ile kötüye kullanım önlenir.

🛡️ Başvuru Akışı (Aday Perspektifi)
mermaid
Kopyala
Düzenle
graph TD
A[Aday mülakat linkine tıklar] --> B{Mülakat aktif mi?}
B -- Evet --> C[Aday başvuru formunu doldurur]
C --> D[Telefonuna OTP kodu gönderilir]
D --> E[Aday OTP kodunu girer]
E -- Doğrulandı --> F[Aday video mülakatına başlar]
E -- Hatalı OTP --> D
B -- Hayır --> G[Mülakat aktif değil - Erişim engeli]
🛠️ Kullanım Örnekleri
Başvuru Yapmak
http
Kopyala
Düzenle
POST /api/public
Content-Type: application/json

{
"name": "Jane",
"surname": "Doe",
"email": "jane@example.com",
"phone": "+905555555555",
"kvkkConsent": true,
"interviewId": "INTERVIEW_ID"
}
OTP Doğrulama
http
Kopyala
Düzenle
POST /api/public/verifyOtp
Content-Type: application/json

{
"applicationId": "APPLICATION_ID",
"otpCode": "123456"
}
📦 Önemli Bağımlılıklar
express – HTTP istek yönetimi

mongoose – MongoDB ORM

joi / yup – DTO şema validasyonları

jsonwebtoken – Aday kimlik doğrulama

express-rate-limit – Rate limiting

cookie-parser – Token saklama ve yönetimi

✅ Özet
Application modülü, mülakat başvurularını, adayların OTP ile doğrulanmasını ve mülakat sürecine başlamalarını güvenli ve düzenli bir şekilde yönetir.
Hem aday hem İK tarafı erişimi için optimize edilmiştir.
Geliştirilebilir, güvenli ve modüler bir yapıdadır.
