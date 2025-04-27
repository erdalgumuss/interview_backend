Interview Modülü - Mülakat Yönetim Sistemi
Bu modül, İK ekiplerinin mülakat oluşturmasını, soruları yönetmesini ve adaylarla paylaşmasını sağlar.
Mülakatlar belirli durumlara (taslak, yayınlandı, inaktif) göre güncellenebilir.

🎯 Modülün Amaçları
İK kullanıcıları yeni mülakat setleri oluşturabilir.

Sorular, kişilik testi, link ve son başvuru tarihi gibi bilgiler düzenlenebilir.

Adaylar yalnızca "yayınlanmış" mülakatlara katılabilir.

İK kullanıcıları kendi mülakatlarını yönetir. (Create, Read, Update, Delete)

📚 Kapsadığı Ana Fonksiyonlar

Fonksiyon Açıklama
createInterview() Yeni bir mülakat oluşturur.
getAllInterviews() (Admin) Sistemdeki tüm mülakatları listeler.
getUserInterviews() İlgili İK kullanıcısının kendi mülakatlarını listeler.
getInterviewById(id) Belirli bir mülakatın detaylarını getirir.
updateInterview(id) Mülakatın detaylarını günceller.
deleteInterview(id) Mülakatı soft delete yapar (kayıtlı kalsın diye).
updateInterviewStatus(id) Mülakatın durumunu değiştirir (taslak → yayınlandı → inaktif).
generateInterviewLink(id) Mülakata özel bir katılım linki oluşturur.
updateInterviewQuestions(id) Mülakattaki soruları günceller.
updatePersonalityTest(id) Mülakata kişilik testi ekler veya çıkarır.
🛠️ Yapı ve Akış

1. InterviewController (controllers/interview.controller.ts)
   HTTP isteklerini alır.

Giriş doğrulaması yapar (req.user).

İş kurallarını InterviewService'e yönlendirir.

Hataları next(error) ile Express hata yönetimine gönderir.

2. InterviewService (services/interview.service.ts)
   Veritabanı işlemlerini yapar.

İş kurallarını uygular:

Sadece mülakatı oluşturan kullanıcı güncelleme/silme yapabilir.

Geçerli statü geçişlerini kontrol eder (taslaktan yayınlamaya geçiş gibi).

3. Routes (routes/interview.routes.ts)
   Router ile tüm uç noktalar tanımlanır.

JWT ile kimlik doğrulama (authenticate) zorunlu tutulur.

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
