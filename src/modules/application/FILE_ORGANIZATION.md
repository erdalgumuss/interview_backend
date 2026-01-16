# Application Modülü - Dosya Organizasyonu

## 📁 Klasör Yapısı

```
src/modules/application/
├── controllers/
│   ├── application.controller.ts     # İK (HR) controller - Protected endpoints
│   └── candidate.controller.ts       # Aday controller - Public endpoints
├── services/
│   ├── application.service.ts        # İK business logic
│   └── candidate.service.ts          # Aday business logic
├── repositories/
│   ├── application.repository.ts     # İK data access
│   └── candidate.repository.ts       # Aday data access
├── routes/
│   ├── application.routes.ts         # İK routes → /api/applications
│   └── candidate.routes.ts           # Aday routes → /api/public
├── models/
│   └── application.model.ts          # Shared model (Application + Candidate profile)
└── dtos/
    ├── hr/                            # İK (HR) DTOs
    │   ├── hrNote.dto.ts
    │   ├── hrRating.dto.ts
    │   ├── applicationFilter.dto.ts
    │   └── updateApplicationStatus.dto.ts
    ├── candidate/                     # Aday DTOs
    │   ├── createApplication.dto.ts
    │   ├── otpVerify.dto.ts
    │   ├── publicInterview.dto.ts
    │   ├── personalInfo.dto.ts
    │   ├── personalityTest.dto.ts
    │   ├── videoResponse.dto.ts
    │   ├── updateCandidate.dto.ts
    │   ├── supportRequest.dto.ts
    │   ├── startApplication.dto.ts
    │   └── interviewDetails.dto.ts
    └── shared/                        # Paylaşılan DTOs
        └── applicationProgress.dto.ts
```

## 🎯 Sorumluluk Ayrımı

### 👔 İK (HR) Domain

**Amaç:** Başvuruları yönetme, inceleme, değerlendirme

**Dosyalar:**

- `controllers/application.controller.ts`
- `services/application.service.ts`
- `repositories/application.repository.ts`
- `routes/application.routes.ts`
- `dtos/hr/*`

**Yetkiler:**

- ✅ JWT Authentication zorunlu
- ✅ Sadece mülakat sahibi erişebilir
- ✅ Tüm başvuruları görüntüleme/filtreleme
- ✅ Başvuru durumunu güncelleme
- ✅ İK notları ekleme/güncelleme/silme
- ✅ Rating verme
- ✅ Video upload durumlarını takip etme

**Endpoint'ler:**

```
GET    /api/applications              - Başvuru listeleme (filtreleme)
GET    /api/applications/:id          - Başvuru detay
PATCH  /api/applications/:id/status   - Status güncelle
POST   /api/applications/:id/notes    - İK notu ekle
PATCH  /api/applications/:id/notes/:noteId - İK notu güncelle
DELETE /api/applications/:id/notes/:noteId - İK notu sil
PATCH  /api/applications/:id/rating   - Rating güncelle
PATCH  /api/applications/:id/videos/:questionId/status - Video status güncelle
```

### 👤 Aday (Candidate) Domain

**Amaç:** Başvuru oluşturma, form doldurma, video/test yanıtlama

**Dosyalar:**

- `controllers/candidate.controller.ts`
- `services/candidate.service.ts`
- `repositories/candidate.repository.ts`
- `routes/candidate.routes.ts`
- `dtos/candidate/*`

**Yetkiler:**

- ✅ Public access (OTP ile authentication)
- ✅ Candidate JWT token
- ✅ Sadece kendi başvurusuna erişim
- ✅ Resume logic (email ile devam etme)

**Endpoint'ler:**

```
GET    /api/public/interview/:interviewId  - Mülakat detayları
POST   /api/public                          - Başvuru oluştur (OTP gönder)
POST   /api/public/verifyOtp                - OTP doğrula
POST   /api/public/resendOtp                - OTP yeniden gönder
PUT    /api/public/update                   - Bilgileri güncelle
POST   /api/public/video/response           - Video yanıtı kaydet
POST   /api/public/personality-test/response - Kişilik testi kaydet
PUT    /api/public/progress                 - Progress güncelle (resume)
POST   /api/applications/resume             - Email ile devam et
```

## 🔄 Shared Components

### Model - `application.model.ts`

- **Tek model yaklaşımı:** Application = Ana nesne
- **Embedded candidate data:** Her başvuru kendi candidate snapshot'ı
- **Sorumluluk:** Her başvuru bağımsız bir lifecycle

### DTOs - `dtos/shared/`

- **applicationProgress.dto.ts:** Hem İK hem aday kullanabilir
  - İK: Progress tracking için okuma
  - Aday: Adım tamamlama için yazma

## 📊 Use Case Mapping

### İK Use Cases:

1. **Başvuru Listeleme:** `application.controller.ts` → `getAllApplications()`
2. **Filtreleme:** `dtos/hr/applicationFilter.dto.ts`
3. **Değerlendirme:** `hrRating.dto.ts`, `hrNote.dto.ts`
4. **Status Yönetimi:** `updateApplicationStatus.dto.ts`

### Aday Use Cases:

1. **Başvuru Başlatma:** `candidate.controller.ts` → `createApplication()`
2. **OTP Doğrulama:** `dtos/candidate/otpVerify.dto.ts`
3. **Form Doldurma:** `personalInfo.dto.ts`, `updateCandidate.dto.ts`
4. **Video Yanıtlama:** `videoResponse.dto.ts`
5. **Test Yanıtlama:** `personalityTest.dto.ts`
6. **Devam Etme (Resume):** `dtos/shared/applicationProgress.dto.ts`

## 🔐 Security & Authorization

### İK Endpoints:

- `authenticate` middleware
- Yetki kontrolü: Mülakat sahibi mi?
- Not sahipliği: Sadece kendi notunu güncelleyebilir

### Aday Endpoints:

- `authenticateCandidate` middleware (OTP sonrası JWT)
- Rate limiting (OTP, başvuru oluşturma)
- IP tracking
- Brute force koruması (OTP denemeleri)

## 📝 Import Path Convention

```typescript
// İK DTOs
import { HRNoteDTO } from "../dtos/hr/hrNote.dto";
import { ApplicationFilterDTO } from "../dtos/hr/applicationFilter.dto";

// Aday DTOs
import { CreateApplicationDTO } from "../dtos/candidate/createApplication.dto";
import { VerifyOtpDTO } from "../dtos/candidate/otpVerify.dto";

// Shared DTOs
import { ApplicationProgressDTO } from "../dtos/shared/applicationProgress.dto";
```

## 🎯 Design Principles

1. **Separation of Concerns:** İK ve Aday işlevleri net ayrılmış
2. **Single Responsibility:** Her controller tek domain'den sorumlu
3. **Clear Boundaries:** DTO klasörleri responsibility'yi gösteriyor
4. **Reusability:** Shared DTOs ortak kullanım için
5. **Maintainability:** Dosya organizasyonu kod okunabilirliğini artırıyor

## 🔄 Migration Notes

✅ **Completed:**

- DTO'lar kategorize edildi (hr/, candidate/, shared/)
- Import path'leri güncellendi
- Controller/Service/Repository ayrımı korundu
- Backward compatibility sağlandı

⚠️ **Dikkat:**

- Tüm DTO import'ları yeni path'leri kullanıyor
- Model hala tek (application.model.ts) - embedded approach
- Route prefix'leri değişmedi (/api/applications, /api/public)
