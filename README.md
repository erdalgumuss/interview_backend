# 🤖 AI Destekli Mülakat Yönetim Sistemi

Bu proje, adayların video yanıtları üzerinden AI destekli mülakat analizleri yapılmasını sağlayan modern bir backend uygulamasıdır.

---

# 🌟 Temel Süreç

- İK birimi mülakat ve soru seti oluşturur.
- Aday, davet linki ile mülakata katılır, sorulara video ile cevap verir.
- Her video, AI sunucusuna gönderilir ve detaylı analiz yapılır.
- AI analiz sonuçları, İK yetkilileri tarafından sistem üzerinden görüntülenir.

---

# 📂 Dosya Yapısı ve Modül Organizasyonu

```plaintext
├── README.md                  # Ana proje açıklamaları
├── package.json                # Proje bağımlılıkları ve scriptler
├── package-lock.json           # Bağımlılıkların sabitlenmiş hali
├── src
│   ├── constants               # Sabitler (hata kodları vb.)
│   ├── middlewares             # Express.js ara katmanları (auth, rate limit, validation)
│   ├── migrations              # Database migration dosyaları (hazırlık aşamasında)
│   ├── modules                 # Ana işlev modülleri
│   │   ├── auth                # Kimlik doğrulama
│   │   ├── interview           # Mülakat yönetimi
│   │   ├── application         # Aday başvuruları yönetimi
│   │   ├── video               # Video yanıt yönetimi
│   │   ├── aiAnalysis          # AI analiz yönetimi
│   │   ├── personalityTest     # Kişilik testi
│   │   ├── notification        # Bildirim sistemi (hazırlık aşamasında)
│   │   ├── dashboard           # Admin/IK panelleri (hazırlık aşamasında)
│   ├── routes                  # Router yapısı
│   ├── server.ts               # Express uygulama başlangıcı
│   ├── services                # Ortak servis fonksiyonları
│   ├── tests                   # Test dosyaları
│   └── utils                   # Yardımcı işlevler
└── tests
    ├── integration
    ├── mocks
    └── unit
```

---

# 🧹 Modül Görevleri

| Modül           | Görevi                | Açıklama                                       |
| :-------------- | :-------------------- | :--------------------------------------------- |
| auth            | Kimlik Doğrulama      | Kayıt, giriş, email doğrulama, şifre sıfırlama |
| interview       | Mülakat Yönetimi      | Soru seti oluşturma ve yönetim                 |
| application     | Aday Başvuru Yönetimi | Başvuru formu, OTP doğrulama                   |
| video           | Video Yanıt Yönetimi  | Video kayıt ve yönetim                         |
| aiAnalysis      | AI Analiz Modülü      | Video AI analiz süreci                         |
| notification    | Bildirimler           | Email/SMS bildirim (hazırlık aşamasında)       |
| personalityTest | Kişilik Testi         | Test oluşturma ve analiz                       |
| dashboard       | IK Panelleri          | Aday izleme ve raporlama                       |

---

# ⚙️ Genel İş Akışı

1. **Mülakat Oluşturma:** İK soru setlerini tanımlar.
2. **Başvuru:** Aday form doldurur, OTP ile doğrulama yapar.
3. **Mülakat:** Video yanıtlar kaydedilir.
4. **AI Analizi:** BullMQ kuyruğu ile videolar AI sunucuya gider.
5. **Sonuçlar:** Analiz verisi sistemde saklanır.
6. **İnceleme:** İK panelinden tüm sonuçlar izlenir.

---

# 📚 Kullanılan Ana Teknolojiler

- **Node.js + Express.js** — API Sunucusu
- **MongoDB + Mongoose** — Veritabanı
- **TypeScript** — Tip güvenli backend
- **BullMQ + Redis** — Kuyruk yönetimi
- **Axios** — HTTP istekleri (AI sunucusu)
- **JWT** — Kimlik Doğrulama
- **AWS S3/CloudFront** — Video dosya barındırma
- **Yup + Joi** — DTO / Validasyon şemaları

---

# 🛠️ Projeyi Çalıştırmak

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda başlatın
npm run dev

# Build alın
npm run build

# Üretim modunda çalıştırın
npm start
```

**Not:** Redis sunucusu aktif olmalıdır.

---

# 🧹 Kod Yapısında Uygulanan Standartlar

- **Controller:** HTTP endpoint mantığı
- **Service:** İş kurallarını yönetir
- **Repository:** Veritabanı işlemleri
- **DTO:** Veri transfer şemaları
- **Middleware:** Auth, validasyon, hata yönetimi
- **Utils:** Yardımcı işlevler

Her modül kendi Controller - Service - Repository - DTO - Model yapısına sahiptir.

---

# 🔥 Yakın Gelişim Planları

- [x] Video upload ve tam kuyruk otomasyonu
- [ ] Admin Dashboard geliştirilmesi
- [ ] Çoklu dil desteği (i18n)
- [ ] AI analizi sonrası otomatik e-posta bilgilendirme
- [ ] İleri düzey raporlama ve istatistik modülleri
- [ ] WebSocket ile anlık analiz bildirimleri

---

# 📢 Katkı Yapmak İster misin?

- Modül README'lerini oku
- Sistemi anla
- PR (Pull Request) gönder

---

# ✍️ Proje Sahibi

**Backend & Sistem Mimari:**

**Erdal Gümüş**

---

# 🌟 Vizyonumuz

> “Mülakat süreçlerini daha adil, objektif ve hızlı hale getirmek. AI destekli insan kaynaklarının geleceğini inşa etmek.”

---

# ✅ Sonuç

Bu proje modüler yapıya uygun geliştirildi. Geliştirilebilirlik, okunabilirlik ve katkı dostu bir sistem tasarlandı. Her seviyeden geliştirici kolayca adapte olabilir.
