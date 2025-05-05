## Interview API Dokümantasyonu

Bu modül, mülakat oluşturma, düzenleme, silme, listeleme ve bağlantı üretme işlemleri için kullanılır.

### Endpoint Listesi

| Yöntem | URL                                  | Açıklama                                       |
| ------ | ------------------------------------ | ---------------------------------------------- |
| POST   | /api/interview/create                | Yeni bir mülakat oluşturur                     |
| GET    | /api/interview/all                   | Tüm mülakatları getirir (admin)                |
| GET    | /api/interview/my                    | Giriş yapan kullanıcının mülakatlarını getirir |
| GET    | /api/interview/\:id                  | Belirli bir mülakatı getirir                   |
| PUT    | /api/interview/\:id                  | Mülakatı günceller                             |
| DELETE | /api/interview/\:id                  | Mülakatı siler (soft delete)                   |
| PUT    | /api/interview/\:id/status           | Mülakatın yayın durumunu günceller             |
| PATCH  | /api/interview/\:id/link             | Katılım linki oluşturur/günceller              |
| PATCH  | /api/interview/\:id/questions        | Mülakata ait soruları günceller                |
| PATCH  | /api/interview/\:id/personality-test | Kişilik testi ID'sini günceller                |

---

### POST /api/interview/create

Yetki: auth (sadece giriş yapmış kullanıcılar)

**Request Body:**

```json
{
  "title": "Frontend Developer Mülakatı",
  "expirationDate": "2025-06-01T00:00:00.000Z",
  "personalityTestId": "66374b82f96e9f0d1df23a70",
  "stages": {
    "personalityTest": true,
    "questionnaire": true
  },
  "questions": [
    {
      "questionText": "React'te lifecycle metotları nelerdir?",
      "expectedAnswer": "componentDidMount, componentDidUpdate...",
      "explanation": "React bileşen yaşam döngüsü",
      "keywords": ["componentDidMount", "useEffect", "lifecycle"],
      "order": 1,
      "duration": 90,
      "aiMetadata": {
        "complexityLevel": "medium",
        "requiredSkills": ["React", "JSX"]
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "66375c212faebec1c46bd123",
    "title": "Frontend Developer Mülakatı",
    "status": "active",
    "createdAt": "2025-05-05T19:45:00.000Z"
  }
}
```

---

### GET /api/interview/my

**Yetki:** auth

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "66375c212faebec1c46bd123",
      "title": "Frontend Developer Mülakatı",
      "status": "draft",
      "expirationDate": "2025-06-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/interview/\:id

**Yetki:** auth

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "66375c212faebec1c46bd123",
    "title": "Frontend Developer Mülakatı",
    "questions": [...],
    "status": "published"
  }
}
```

---

### PUT /api/interview/\:id

**Yetki:** auth + owner kontrolü

**Request Body:**

```json
{
  "title": "Senior Frontend Mülakatı",
  "expirationDate": "2025-07-01T00:00:00.000Z",
  "status": "draft"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Senior Frontend Mülakatı",
    "status": "draft"
  }
}
```

---

### DELETE /api/interview/\:id

**Yetki:** auth + owner kontrolü

**Response:**

```json
{
  "success": true,
  "message": "Interview deleted successfully"
}
```

---

### PUT /api/interview/\:id/status

**Yetki:** auth + owner kontrolü

**Request Body:**

```json
{
  "newStatus": "published"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "published"
  }
}
```

---

### PATCH /api/interview/\:id/link

**Yetki:** auth + owner kontrolü

**Request Body:**

```json
{
  "expirationDate": "2025-06-15T00:00:00.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "link": "https://localhost:3001/application/66375c212faebec1c46bd123",
    "expirationDate": "2025-06-15T00:00:00.000Z"
  }
}
```

---

### PATCH /api/interview/\:id/questions

**Yetki:** auth + owner kontrolü

**Request Body:**

```json
{
  "questions": [ {...}, {...} ]
}
```

**Response:**

```json
{
  "success": true,
  "data": [ {...}, {...} ]
}
```

---

### PATCH /api/interview/\:id/personality-test

**Yetki:** auth + owner kontrolü

**Request Body:**

```json
{
  "personalityTestId": "66374b82f96e9f0d1df23a70"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "66375c212faebec1c46bd123",
    "personalityTestId": "66374b82f96e9f0d1df23a70"
  }
}
```
