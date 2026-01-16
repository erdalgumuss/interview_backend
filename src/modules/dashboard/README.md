# Dashboard Modülü - README

## 📊 İK Dashboard Servisi

Bu modül, İnsan Kaynakları için kapsamlı bir dashboard sistemi sağlar. Başvuru istatistikleri, trendler, aktif mülakatlar, departman analizleri ve favori adaylar gibi kritik metrikleri sunar.

---

## 🗂️ Dosya Yapısı

```
src/modules/dashboard/
├── controllers/
│   └── dashboard.controller.ts    # HTTP request handling
├── services/
│   └── dashboard.service.ts       # Business logic
├── repositories/
│   └── dashboard.repository.ts    # Database queries
├── dtos/
│   ├── dashboardStats.dto.ts      # Toplam istatistikler
│   ├── applicationTrend.dto.ts    # Haftalık trend verileri
│   ├── recentApplication.dto.ts   # Son başvurular
│   ├── activeInterview.dto.ts     # Aktif mülakatlar
│   ├── departmentStats.dto.ts     # Departman istatistikleri
│   └── dashboardResponse.dto.ts   # Ana response DTO
└── routes/
    └── dashboard.routes.ts        # API endpoints
```

---

## 🔌 API Endpoints

### 1. Ana Dashboard Verileri

```
GET /api/dashboard
Authorization: Bearer Token (Cookie)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalApplications": 150,
      "acceptedApplications": 45,
      "rejectedApplications": 20,
      "pendingApplications": 60,
      "completedApplications": 25
    },
    "applicationTrend": {
      "currentWeekApplications": 35,
      "previousWeekApplications": 28,
      "weeklyAverage": 32.5,
      "percentageChange": 25.0,
      "trendDirection": "up"
    },
    "weeklyTrends": [
      {
        "week": "2026-W01",
        "weekLabel": "1. Hafta",
        "applicationCount": 28,
        "startDate": "2026-01-05T00:00:00.000Z",
        "endDate": "2026-01-11T23:59:59.999Z"
      }
    ],
    "recentApplications": [
      {
        "id": "...",
        "candidateName": "Ahmet Yılmaz",
        "candidateEmail": "ahmet@example.com",
        "interviewTitle": "Backend Developer",
        "interviewId": "...",
        "status": "completed",
        "aiScore": 85.5,
        "appliedAt": "2026-01-15T10:30:00.000Z",
        "isFavorite": false
      }
    ],
    "activeInterviews": [
      {
        "id": "...",
        "title": "Frontend Developer",
        "department": "IT",
        "status": "active",
        "questionCount": 5,
        "totalApplications": 42,
        "pendingApplications": 15,
        "completedApplications": 27,
        "averageAIScore": 78.3,
        "totalDuration": 25,
        "expirationDate": "2026-02-01T00:00:00.000Z",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "departmentStats": [
      {
        "department": "IT",
        "totalApplications": 80,
        "acceptedApplications": 30,
        "rejectedApplications": 10,
        "pendingApplications": 40,
        "averageAIScore": 82.5,
        "activeInterviews": 5
      }
    ],
    "favoriteApplications": [],
    "notifications": [],
    "statusDistribution": [
      {
        "status": "pending",
        "count": 60,
        "percentage": 40.0
      }
    ]
  }
}
```

### 2. Favori Toggle (Ekle/Çıkar)

```
POST /api/dashboard/favorites/:applicationId
Authorization: Bearer Token (Cookie)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "isFavorite": true,
    "message": "Başvuru favorilere eklendi"
  }
}
```

### 3. Başvuru Trendleri (Filtreli)

```
GET /api/dashboard/trends?startDate=2026-01-01&endDate=2026-01-15
Authorization: Bearer Token (Cookie)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "weeklyTrends": [...],
    "totalApplications": 130
  }
}
```

---

## 📦 Dashboard İçeriği

### 1. **Genel İstatistikler** (`stats`)

- Toplam başvuru sayısı
- Onaylanan adaylar
- Reddedilen adaylar
- Bekleyen başvurular
- Tamamlanan başvurular

### 2. **Başvuru Trendleri** (`applicationTrend`)

- Bu haftaki başvuru sayısı
- Geçen haftaki başvuru sayısı
- Haftalık ortalama
- Yüzdelik değişim (%)
- Trend yönü (up/down/stable)

### 3. **Haftalık Trend Grafiği** (`weeklyTrends`)

- Son 4 haftanın verileri
- Her hafta için başvuru sayısı
- Hafta başlangıç ve bitiş tarihleri

### 4. **Son Başvurular** (`recentApplications`)

- Son 10 başvuru
- Aday bilgileri
- Mülakat başlığı
- Başvuru durumu
- AI skoru
- Favori durumu

### 5. **Aktif Mülakatlar** (`activeInterviews`)

- 10 adet aktif mülakat
- Mülakat detayları (başlık, departman, durum)
- Soru sayısı
- Toplam başvuru sayısı
- Bekleyen/tamamlanan başvurular
- Ortalama AI skoru
- Toplam süre (dakika)

### 6. **Departman İstatistikleri** (`departmentStats`)

- Departman bazlı başvuru dağılımı
- Her departman için detaylı istatistikler
- Ortalama AI skorları
- Aktif mülakat sayıları

### 7. **Favori Adaylar** (`favoriteApplications`)

- İK kullanıcısının favori işaretlediği adaylar
- Son başvurular ile aynı formatta

### 8. **Son Bildirimler** (`notifications`)

- Henüz bildirim servisi yok
- Boş array olarak döner
- İleriye dönük hazırlık

### 9. **Status Dağılımı** (`statusDistribution`)

- Başvuru durumlarının dağılımı
- Her durum için sayı ve yüzde

---

## 🔧 Teknik Detaylar

### Model Güncellemeleri

**Application Model:**

```typescript
favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }];
```

**Interview Model:**

```typescript
department: {
  type: String;
} // IT, İK, Satış, vb.
```

### Performans Optimizasyonları

**Indexler:**

```typescript
// Application Model
ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ createdAt: -1 });
ApplicationSchema.index({ favoritedBy: 1 });
```

**Aggregation Pipeline:**

- MongoDB aggregation kullanılarak veritabanı seviyesinde hesaplamalar
- Paralel query execution ile performans optimizasyonu
- Populate ile ilişkili verilerin tek sorguda getirilmesi

### Güvenlik

- JWT authentication zorunlu (authenticate middleware)
- Kullanıcı sadece kendi oluşturduğu mülakatların verilerini görebilir
- Error handling ile güvenli hata mesajları
- Input validation

---

## 🚀 Kullanım

### Controller'da Method Binding

```typescript
constructor() {
  this.dashboardService = new DashboardService();
  this.getDashboard = this.getDashboard.bind(this);
}
```

### Service'de Business Logic

```typescript
// Paralel veri çekme
const [stats, trends, recent] = await Promise.all([
  this.repository.getStats(userId),
  this.repository.getTrends(userId),
  this.repository.getRecent(userId),
]);
```

### Repository'de Aggregation

```typescript
// MongoDB aggregation pipeline
const stats = await ApplicationModel.aggregate([
  { $match: { interviewId: { $in: interviewIds } } },
  { $group: { _id: null, total: { $sum: 1 } } },
]);
```

---

## 📝 Notlar

1. **Bildirim Servisi:** Henüz implement edilmedi, `notifications: []` boş array döner
2. **Departman Field:** Interview modelinde yeni eklendi, eski kayıtlarda null olabilir
3. **Favori Sistem:** Çok kullanıcılı (many-to-many) ilişki, bir başvuru birden fazla kullanıcı tarafından favorilere eklenebilir
4. **Haftalık Trendler:** ISO hafta numarası kullanılır (Pazartesi başlangıçlı)
5. **AI Skorları:** `generalAIAnalysis.overallScore` fieldından alınır, yoksa undefined döner

---

## 🔄 İleriye Dönük Geliştirmeler

- [ ] Gerçek zamanlı bildirimler (WebSocket)
- [ ] Grafik export (PDF, Excel)
- [ ] Özel tarih aralığı filtreleme
- [ ] Departman karşılaştırma grafikleri
- [ ] Email özet raporları
- [ ] Cache stratejisi (Redis)
- [ ] Dashboard widget customization

---

## 🐛 Hata Ayıklama

### Yaygın Hatalar

**401 Unauthorized:**

- JWT token eksik veya geçersiz
- Cookie ayarlarını kontrol edin

**404 Not Found:**

- Başvuru bulunamadı (favori toggle için)
- Application ID'yi kontrol edin

**500 Internal Server Error:**

- MongoDB bağlantı hatası
- Aggregation pipeline hatası
- Log dosyalarını kontrol edin

---

## 📧 İletişim

Sorular veya öneriler için proje maintainer'ı ile iletişime geçin.
