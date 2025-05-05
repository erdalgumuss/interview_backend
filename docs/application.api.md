## Application API Dokümantasyonu

### Modül: Başvuru (Application)

Adayların mülakatlara başvurma, kişisel bilgilerini tamamlama, OTP doğrulama, kişilik testi gönderme gibi işlemleri kapsar.

**Base URL:** `/api/application`

---

### \[GET] /api/application/\:id

**Açıklama:** Belirli başvurunun detaylarını döner. Sadece ilgili HR erişebilir.

**Headers:**

```
Authorization: Bearer <HR_JWT>
```

**Params:**

- `id` (string, ✅): Başvuru ID

**Response:**

```json
{
  "success": true,
  "data": { ...Application Object... }
}
```

---

### \[GET] /api/application/public/\:interviewId

**Açıklama:** Aday için mülakat detaylarını döner (public erişim).

**Params:**

- `interviewId` (string, ✅): Mülakat ID

**Response:**

```json
{
  "success": true,
  "data": {
    "interviewId": "abc123",
    "title": "Frontend Geliştirici Mülakatı",
    "expirationDate": "2025-06-01T00:00:00.000Z",
    "questions": [ ... ]
  }
}
```

---

### \[POST] /api/application/create

**Açıklama:** Aday başvuru kaydı oluşturur, OTP SMS gönderilir.

**Body:**

```json
{
  "interviewId": "abc123",
  "name": "Ayşe",
  "surname": "Yılmaz",
  "email": "ayse@example.com",
  "phone": "+905555555555",
  "kvkkConsent": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "applicationId": "xyz456",
    "status": "pending",
    "phoneVerified": false
  }
}
```

---

### \[POST] /api/application/verify-otp

**Açıklama:** Adayın OTP kodunu doğrular, doğrulanırsa JWT döner.

**Body:**

```json
{
  "applicationId": "xyz456",
  "otpCode": "348293"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "applicationId": "xyz456",
    "status": "pending",
    "phoneVerified": true,
    "token": "JWT_TOKEN"
  }
}
```

---

### \[POST] /api/application/resend-otp

**Açıklama:** Süresi geçen OTP kodunu yeniden gönderir.

**Body:**

```json
{
  "applicationId": "xyz456"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "expiresAt": "2025-05-05T15:30:00.000Z"
  }
}
```

---

### \[PUT] /api/application/update-details

**Açıklama:** Aday kişisel bilgilerini günceller (eğitim, deneyim, beceriler).

**Body:**

```json
{
  "applicationId": "xyz456",
  "education": [
    {
      "school": "Boğaziçi Üniversitesi",
      "degree": "Lisans",
      "graduationYear": 2023
    }
  ],
  "experience": [
    {
      "company": "ABC Yazılım",
      "position": "Frontend Developer",
      "duration": "2020 - 2023",
      "responsibilities": "React projelerinde geliştirme"
    }
  ],
  "skills": {
    "technical": ["React", "TypeScript"],
    "personal": ["Takım çalışması"],
    "languages": ["İngilizce"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "applicationId": "xyz456",
    "completed": true
  }
}
```

---

### \[POST] /api/application/personality-test

**Açıklama:** Kişilik testi cevaplarını kaydeder.

**Body:**

```json
{
  "testId": "abc111",
  "answers": {
    "q1": 5,
    "q2": 3,
    "q3": 4
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "score": {
      "openness": 72,
      "agreeableness": 61
    }
  }
}
```

---

### \[POST] /api/application/support-request

**Açıklama:** Adaydan gelen destek talebini kaydeder.

**Body:**

```json
{
  "message": "Kameram çalışmıyor.",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.domain.com/error.jpg"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "supportRequestId": "req789"
  }
}
```
## Application API Dokümantasyonu

### Modül: Başvuru (Application)

Adayların mülakatlara başvurma, kişisel bilgilerini tamamlama, OTP doğrulama, kişilik testi gönderme gibi işlemleri kapsar.

**Base URL:** `/api/application`

---

### \[GET] /api/application/\:id

**Açıklama:** Belirli başvurunun detaylarını döner. Sadece ilgili HR erişebilir.
**Authorization:** Gerekli (HR)

...

### \[POST] /api/application/support-request

**Açıklama:** Adaydan gelen destek talebini kaydeder.

...

---

## 🛠 Eksik veya Eklenmesi Önerilen Endpointler

### \[GET] /api/application/\:id/support-requests

**Açıklama:** Belirli bir başvurunun tüm destek taleplerini listeler.
**Authorization:** Gerekli (HR veya Aday)

**Response:**

```json
{
  "success": true,
  "data": [ { "message": "...", "createdAt": "..." }, ... ]
}
```

---

### \[POST] /api/application/start

**Açıklama:** Aday mülakatı başlatır. Gerekli kontroller (doğrulama, test durumu) yapılır.
**Authorization:** Gerekli (Aday)

**Body:**

```json
{
  "applicationId": "xyz456"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "started"
  }
}
```

---

### \[GET] /api/application/\:id/ai-analysis

**Açıklama:** AI tarafından yapılmış genel analiz raporunu döner.
**Authorization:** Gerekli (HR)

**Response:**

```json
{
  "success": true,
  "data": {
    "scores": { ... },
    "summary": "Aday güçlüdür..."
  }
}
```

---

### \[GET] /api/application/by-email?email=

**Açıklama:** E-posta adresine göre başvuru listesi döner.
**Authorization:** Gerekli (Admin)

**Response:**

```json
{
  "success": true,
  "data": [ { "applicationId": "...", "status": "pending" }, ... ]
}
```

---

### \[DELETE] /api/application/\:id

**Açıklama:** Başvuruyu siler veya pasif duruma getirir.
**Authorization:** Gerekli (Admin veya HR)

**Response:**

```json
{
  "success": true,
  "message": "Application deleted."
}
```

---

### \[PATCH] /api/application/\:id/retry-config

**Açıklama:** Retry ayarlarını günceller.
**Authorization:** Gerekli (HR)

**Body:**

```json
{
  "allowRetry": true,
  "maxRetryAttempts": 3
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "allowRetry": true,
    "maxRetryAttempts": 3
  }
}
```

---

### \[GET] /api/application/\:id/status

**Açıklama:** Başvuru ve AI analiz durumunu kontrol eder.
**Authorization:** Gerekli (HR veya Aday)

**Response:**

```json
{
  "success": true,
  "data": {
    "applicationStatus": "completed",
    "aiAnalysisCompleted": true
  }
}
```

---

## 🔐 Yetkilendirme

Her endpoint'in başına açıkça `Authorization` bilgisi eklenmiştir.

## ⚠️ Hata Yanıtları Örnekleri (Genel)

* `401 Unauthorized`: Token eksik veya geçersiz
* `403 Forbidden`: Yetki yetersiz
* `404 Not Found`: Veri bulunamadı
* `409 Conflict`: Çakışma (ör. e-posta ile daha önce başvuru yapılmış)

## 🔗 DTO ve Referans Belgeler

* `CreateApplicationDTO`
* `UpdateApplicationDTO`
* `VerifyOtpDTO`

(Teknik dökümantasyon dosyasına bağlanabilir.)
