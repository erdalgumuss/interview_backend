# 🎬 Video Module

## 📋 Genel Bakış

Video modülü, adayların mülakat sorularına verdiği video yanıtlarının yüklenmesi, depolanması ve yönetilmesinden sorumludur. AWS S3/CloudFront entegrasyonu ile güvenli video depolama sağlar.

## 🎯 Modülün Amaçları

- Adayların video yanıtlarını güvenli şekilde yüklemesi
- S3/CloudFront URL doğrulaması
- Video işleme durumu takibi
- AI analiz için video verisi hazırlığı
- Başvuru tamamlama otomasyonu

## 🏗️ Mimari Yapı

```
video/
├── controllers/
│   └── videoResponse.controller.ts    # HTTP endpoint handler'ları
├── dtos/
│   └── videoResponse.dto.ts           # Validasyon şemaları
├── models/
│   └── videoResponse.model.ts         # Mongoose şeması
├── repositories/
│   └── videoResponse.repository.ts    # Veritabanı işlemleri
├── routes/
│   └── videoResponse.routes.ts        # Rota tanımları
├── services/
│   └── videoResponse.service.ts       # İş mantığı
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `application` | Ana İlişki | Başvuru durumu güncelleme |
| `interview` | Referans | Soru bilgisi doğrulama |
| `aiAnalysis` | Çıktı | Video AI analizine gönderilir |

### Dış Bağımlılıklar
| Servis | Kullanım |
|--------|----------|
| AWS S3 | Video depolama |
| CloudFront | Video CDN dağıtımı |

---

## 📊 Veri Modeli

### IVideoResponse Interface

```typescript
interface IVideoResponse extends Document {
  _id: ObjectId;
  applicationId: ObjectId;           // Bağlı başvuru
  questionId: ObjectId;              // Yanıtlanan soru
  videoUrl: string;                  // S3/CloudFront URL
  duration: number;                  // Video süresi (saniye)
  status: 'pending' | 'processing' | 'processed' | 'failed';
  uploadedAt: Date;
  processedAt?: Date;
  metadata?: {
    fileSize?: number;
    format?: string;
    resolution?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Mongoose Schema

```typescript
const videoResponseSchema = new Schema<IVideoResponse>({
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true
  },
  questionId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  videoUrl: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^https:\/\/(.*\.s3\..*amazonaws\.com|.*\.cloudfront\.net)\//.test(v),
      message: 'Video URL must be from S3 or CloudFront'
    }
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'failed'],
    default: 'pending'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  metadata: {
    fileSize: Number,
    format: String,
    resolution: String
  }
}, {
  timestamps: true
});

// Compound index - her soru için tek video
videoResponseSchema.index({ applicationId: 1, questionId: 1 }, { unique: true });
```

### Video Durum Akışı

```
        ┌────────────┐
        │   pending  │ ← Video yüklendi
        └─────┬──────┘
              │
              ▼
        ┌────────────┐
        │ processing │ ← AI analiz başladı
        └─────┬──────┘
              │
       ┌──────┴──────┐
       ▼             ▼
┌────────────┐ ┌────────────┐
│  processed │ │   failed   │
│ (başarılı) │ │  (hatalı)  │
└────────────┘ └────────────┘
```

---

## 📡 API Endpoints

### Base URL: `/api/video`

### Endpoint Listesi

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/upload` | Video yanıtı yükle | Candidate |
| `GET` | `/` | Tüm video yanıtlarını listele | Candidate |
| `GET` | `/:id` | Tekil video detayı | Candidate |
| `DELETE` | `/:id` | Video yanıtı sil | Candidate |

### 1. Video Yükleme

```http
POST /api/video/upload
Authorization: Bearer <candidate_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "applicationId": "66f1a2b3c4d5e6f7a8b9c0d1",
  "questionId": "66f2a3b4c5d6e7f8a9b0c1d2",
  "videoUrl": "https://bucket.s3.eu-west-1.amazonaws.com/videos/123.mp4",
  "duration": 120,
  "metadata": {
    "fileSize": 15728640,
    "format": "mp4",
    "resolution": "1080p"
  }
}
```

**Validation Rules:**
- `applicationId`: Required, valid ObjectId, must belong to authenticated candidate
- `questionId`: Required, valid ObjectId, must exist in interview
- `videoUrl`: Required, S3 or CloudFront URL format
- `duration`: Required, positive number (seconds)
- `metadata`: Optional

**Response (201):**
```json
{
  "success": true,
  "message": "Video yanıtı başarıyla yüklendi",
  "data": {
    "videoResponse": {
      "_id": "66f3a4b5c6d7e8f9a0b1c2d3",
      "applicationId": "66f1a2b3c4d5e6f7a8b9c0d1",
      "questionId": "66f2a3b4c5d6e7f8a9b0c1d2",
      "videoUrl": "https://bucket.s3.eu-west-1.amazonaws.com/videos/123.mp4",
      "duration": 120,
      "status": "pending",
      "uploadedAt": "2024-01-15T14:30:00Z"
    },
    "applicationCompleted": true
  }
}
```

### 2. Video Listesi

```http
GET /api/video
Authorization: Bearer <candidate_token>
```

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `applicationId` | string | Başvuru ID filtresi |
| `status` | string | Durum filtresi |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "_id": "66f3a4b5c6d7e8f9a0b1c2d3",
        "applicationId": "66f1a2b3c4d5e6f7a8b9c0d1",
        "questionId": "66f2a3b4c5d6e7f8a9b0c1d2",
        "videoUrl": "https://d123.cloudfront.net/videos/123.mp4",
        "duration": 120,
        "status": "processed",
        "uploadedAt": "2024-01-15T14:30:00Z",
        "processedAt": "2024-01-15T14:35:00Z"
      }
    ],
    "total": 5
  }
}
```

### 3. Tekil Video Detayı

```http
GET /api/video/:id
Authorization: Bearer <candidate_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "videoResponse": {
      "_id": "66f3a4b5c6d7e8f9a0b1c2d3",
      "applicationId": {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
        "status": "completed"
      },
      "questionId": "66f2a3b4c5d6e7f8a9b0c1d2",
      "videoUrl": "https://d123.cloudfront.net/videos/123.mp4",
      "duration": 120,
      "status": "processed",
      "metadata": {
        "fileSize": 15728640,
        "format": "mp4",
        "resolution": "1080p"
      }
    }
  }
}
```

---

## 🔧 Service Metodları

### VideoResponseService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `uploadVideoResponse` | `dto, candidateId` | `{ videoResponse, applicationCompleted }` | Video yükle |
| `getVideoResponses` | `candidateId, filters?` | `IVideoResponse[]` | Video listesi |
| `getVideoResponseById` | `id, candidateId` | `IVideoResponse` | Tekil video |
| `deleteVideoResponse` | `id, candidateId` | `void` | Video sil |
| `updateVideoStatus` | `id, status` | `IVideoResponse` | Durum güncelle |
| `getVideoResponsesByApplication` | `applicationId` | `IVideoResponse[]` | Başvuru videoları |

### Kritik İş Mantığı

```typescript
async uploadVideoResponse(dto: UploadVideoDto, candidateId: string) {
  // 1. Başvuru doğrulama
  const application = await this.applicationService.getById(dto.applicationId);
  if (application.candidateId.toString() !== candidateId) {
    throw new AppError('Bu başvuruya erişim yetkiniz yok', 403);
  }

  // 2. Soru doğrulama
  const interview = await this.interviewService.getById(application.interviewId);
  const questionExists = interview.questions.some(q => q._id.toString() === dto.questionId);
  if (!questionExists) {
    throw new AppError('Geçersiz soru ID', 400);
  }

  // 3. Duplikasyon kontrolü
  const existingVideo = await this.repository.getByApplicationAndQuestion(
    dto.applicationId, 
    dto.questionId
  );
  if (existingVideo) {
    throw new AppError('Bu soruya zaten video yüklenmiş', 400);
  }

  // 4. Video URL doğrulama
  if (!this.isValidStorageUrl(dto.videoUrl)) {
    throw new AppError('Geçersiz video URL formatı', 400);
  }

  // 5. Video kaydet
  const videoResponse = await this.repository.save(dto);

  // 6. Başvuru tamamlanma kontrolü
  const allVideos = await this.repository.getByApplication(dto.applicationId);
  const requiredQuestions = interview.questions.length;
  const applicationCompleted = allVideos.length >= requiredQuestions;

  if (applicationCompleted) {
    await this.applicationService.markAsCompleted(dto.applicationId);
  }

  return { videoResponse, applicationCompleted };
}
```

---

## 📦 Repository Metodları

### VideoResponseRepository

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `save` | `data` | `IVideoResponse` | Yeni kayıt |
| `findById` | `id` | `IVideoResponse \| null` | ID ile bul |
| `findByApplication` | `applicationId` | `IVideoResponse[]` | Başvuru videoları |
| `findByApplicationAndQuestion` | `appId, qId` | `IVideoResponse \| null` | Soru videosu |
| `updateStatus` | `id, status` | `IVideoResponse` | Durum güncelle |
| `delete` | `id` | `void` | Kayıt sil |

---

## ✅ DTO Validasyonları

### UploadVideoDto

```typescript
const uploadVideoSchema = Joi.object({
  applicationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçerli bir başvuru ID giriniz',
      'any.required': 'Başvuru ID zorunludur'
    }),
  
  questionId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Geçerli bir soru ID giriniz',
      'any.required': 'Soru ID zorunludur'
    }),
  
  videoUrl: Joi.string()
    .uri()
    .pattern(/^https:\/\/(.*\.s3\..*amazonaws\.com|.*\.cloudfront\.net)\//)
    .required()
    .messages({
      'string.uri': 'Geçerli bir URL giriniz',
      'string.pattern.base': 'Video URL S3 veya CloudFront formatında olmalıdır',
      'any.required': 'Video URL zorunludur'
    }),
  
  duration: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Süre pozitif olmalıdır',
      'any.required': 'Video süresi zorunludur'
    }),
  
  metadata: Joi.object({
    fileSize: Joi.number().positive(),
    format: Joi.string().valid('mp4', 'webm', 'mov'),
    resolution: Joi.string()
  }).optional()
});
```

---

## 🛡️ Güvenlik

### 1. URL Doğrulama

```typescript
private isValidStorageUrl(url: string): boolean {
  const s3Pattern = /^https:\/\/[\w-]+\.s3\.[\w-]+\.amazonaws\.com\//;
  const cloudFrontPattern = /^https:\/\/[\w]+\.cloudfront\.net\//;
  return s3Pattern.test(url) || cloudFrontPattern.test(url);
}
```

### 2. Yetki Kontrolleri

- JWT ile doğrulanmış aday
- Sadece kendi başvurularına video yükleyebilir
- Sadece kendi videolarını görüntüleyebilir/silebilir

### 3. Duplikasyon Koruması

- `(applicationId, questionId)` compound unique index
- Her soruya sadece bir video yüklenebilir

### 4. Rate Limiting

- Video upload endpoint'i için özel rate limit
- Candidate auth middleware'de tetiklenir

---

## 📈 İş Akışları

### Video Yükleme Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                    CANDIDATE CLIENT                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ 1. Video dosyasını S3'e yükle
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS S3                                  │
│              (Presigned URL ile upload)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ 2. S3 URL'i al
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 POST /api/video/upload                       │
│                    (videoUrl: S3 URL)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               VideoResponseController                        │
│                   uploadVideoResponse                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                VideoResponseService                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Başvuru sahipliği kontrolü                       │    │
│  │ 2. Soru varlık kontrolü                             │    │
│  │ 3. Duplikasyon kontrolü                             │    │
│  │ 4. URL format doğrulama                             │    │
│  │ 5. Video kaydı oluştur                              │    │
│  │ 6. Başvuru tamamlanma kontrolü                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
┌─────────────────┐   ┌─────────────────────────┐
│  Video Kaydı    │   │   Başvuru Completed?    │
│   Oluşturuldu   │   │   (tüm sorular cevaplı) │
└─────────────────┘   └────────────┬────────────┘
                                   │ Evet
                                   ▼
                      ┌─────────────────────────┐
                      │ ApplicationService      │
                      │ markAsCompleted()       │
                      │ → AI Analiz Job Queue   │
                      └─────────────────────────┘
```

### AI İşleme Akışı

```
┌─────────────────┐
│ Video Response  │
│ status: pending │
└────────┬────────┘
         │ AI Worker tetiklenir
         ▼
┌─────────────────┐
│ Video Response  │
│status:processing│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│processed│ │ failed │
└────────┘ └────────┘
```

---

## 🧪 Test Senaryoları

| Senaryo | Girdi | Beklenen Sonuç |
|---------|-------|----------------|
| Başarılı Upload | Geçerli tüm alanlar | 201, video kaydı |
| Yetkisiz Başvuru | Başka kullanıcının applicationId | 403 Forbidden |
| Geçersiz Soru | Mülakatta olmayan questionId | 400 Bad Request |
| Duplikasyon | Aynı soruya ikinci video | 400 Already exists |
| Geçersiz URL | S3/CloudFront olmayan URL | 400 Invalid URL |
| Sıfır Süre | duration: 0 | 400 Validation error |
| Tamamlama | Son soru videosu | applicationCompleted: true |

---

## ⚠️ Hata Kodları

| Hata Kodu | HTTP | Açıklama |
|-----------|------|----------|
| `VIDEO_NOT_FOUND` | 404 | Video bulunamadı |
| `INVALID_APPLICATION` | 400 | Geçersiz başvuru ID |
| `INVALID_QUESTION` | 400 | Soru mülakatta yok |
| `VIDEO_ALREADY_EXISTS` | 400 | Soru zaten cevaplanmış |
| `INVALID_VIDEO_URL` | 400 | URL formatı geçersiz |
| `FORBIDDEN` | 403 | Erişim yetkisi yok |
| `DURATION_REQUIRED` | 400 | Video süresi zorunlu |

---

## 📝 Versiyon Notları

### v1.0 (Güncel)
- Video yükleme endpoint'i
- S3/CloudFront URL doğrulama
- Duplikasyon koruması
- Otomatik başvuru tamamlama
- Video durum takibi

---

## 🔗 İlgili Dokümantasyon

- [Application Module](../application/README.md)
- [Interview Module](../interview/README.md)
- [AI Analysis Module](../aiAnalysis/README.md)
- [Candidates Module](../candidates/README.md)
