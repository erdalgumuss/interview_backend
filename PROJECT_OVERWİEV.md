PROJECT_OVERVIEW.md
Proje Adı
AI Destekli Mülakat Yönetim Sistemi

Proje Amacı
Adayların video yanıtları üzerinden AI destekli analiz yaparak, insan kaynakları süreçlerini daha adil, verimli ve hızlı hale getirmek.

Genel Sistem Akışı

1. İK Kullanıcısı → Mülakat oluşturur (soru setleri, süreler, testler)
2. Aday → Mülakat linkinden başvurur, OTP doğrulaması yapar
3. Aday → Sorulara video yanıtlar yükler
4. Sistem → Videoları AI sunucusuna gönderir, analiz sonuçlarını kaydeder
5. İK Kullanıcısı → Adayın cevaplarını ve AI analiz sonuçlarını görüntüler
   Ana Bileşenler ve Modüller

Modül Açıklama
Auth Kullanıcı kayıt, giriş, şifre sıfırlama işlemleri
Interview Mülakat ve soru setleri oluşturma, yönetme
Application Aday başvurusu oluşturma, OTP ile doğrulama, başvuru yönetimi
Video Adayın video yanıtlarını yüklemesi ve listelemesi
AI Analysis Videoların AI ile analiz edilmesi ve sonuçların kaydedilmesi
Personality Test Adayların kişilik testlerini cevaplaması ve sonuçlarının kaydedilmesi
Notification (Hazırlık) SMS/email bildirim gönderimi
Dashboard (Hazırlık) İK için istatistik ve raporlama ekranları
Teknik Altyapı
Backend: Node.js + Express.js + TypeScript

Veritabanı: MongoDB (Mongoose ODM)

Kuyruk Sistemi: Redis + BullMQ

Kimlik Doğrulama: JWT (cookie tabanlı)

AI Sunucu İletişimi: Axios ile HTTP API üzerinden

Depolama: AWS S3 veya eşdeğer CDN altyapıları

Ortak Mimariler ve Prensipler
Modüler yapı: Her modül kendi controller-service-repository-dto yapısına sahiptir.

DTO Kullanımı: Tüm API giriş/çıkışları DTO üzerinden validate edilir.

Error Handling: Standart AppError kullanımı zorunludur.

Güvenlik:

Yetkilendirme middleware’leri (authenticate, authenticateCandidate, authenticateAdmin)

Rate limiting

IP ve User-Agent loglaması

Queue ve AI İşlemleri:

Video kaydedildikten sonra işlenmek üzere kuyrukta bekletilir.

Kuyrukta sırası geldiğinde AI sunucuya video + soru bilgisi ile gönderilir.

AI sonucu geldikten sonra MongoDB'ye kaydedilir.

Geliştirme / Deployment Gereksinimleri
Node.js 18+

MongoDB 6+

Redis 7+ (BullMQ için)

.env dosyasında gerekli environment değişkenleri:

JWT_SECRET

DB_URI

REDIS_URI

AI_SERVER_URL

COOKIE_SECURE

(ve diğerleri)
