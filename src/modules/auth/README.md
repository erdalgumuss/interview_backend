Auth Modülü - Kullanıcı Kimlik Doğrulama Sistemi
Bu modül, kullanıcıların kayıt olması, e-posta doğrulaması, giriş yapması, token yönetimi ve şifre sıfırlama işlemlerini kapsar.

🎯 Modülün Amaçları
Kullanıcıların register, login, logout gibi temel işlemlerini yönetmek.

JWT Access Token ve Refresh Token sistemiyle güvenli oturum yönetimi.

Şifre sıfırlama, e-posta doğrulama ve kullanıcı aktivasyon süreçlerini desteklemek.

Çoklu cihazlardan giriş ve token güvenliğini korumak.

📚 Kapsadığı Ana Fonksiyonlar

Fonksiyon Açıklama
POST /auth/register Yeni kullanıcı kaydı oluşturur.
GET /auth/verify-email Email doğrulama token'ı ile kullanıcıyı aktif eder.
POST /auth/login Kullanıcı giriş yapar, access ve refresh token alır.
POST /auth/logout Kullanıcının refresh token'ını iptal eder.
POST /auth/refresh Refresh token ile yeni access token alır.
POST /auth/forgot-password Şifre sıfırlamak için mail gönderir.
POST /auth/reset-password Gelen token ile şifreyi sıfırlar.
🛠️ Yapı ve Akış

1. Controller Katmanı (controllers/auth.controller.ts)
   HTTP isteklerini karşılar ve gerekli service/metotları tetikler.

register: Kullanıcıyı kaydeder ve email doğrulama token'ı yollar.

verifyEmail: Gelen token'ı çözümler ve kullanıcıyı aktif hale getirir.

login: Email + şifre kontrolü yapar, başarılı girişte cookie'lere access ve refresh token yazar.

logout: Kullanıcının refresh token'ını iptal eder ve cookie'leri temizler.

refreshAccessToken: Refresh token ile yeni access ve refresh token üretir.

requestPasswordReset: Şifre sıfırlama isteği oluşturur, kullanıcıya email gönderir.

resetPassword: Şifre sıfırlama token'ı ile yeni şifre belirler.

2. Service Katmanı (services/auth.service.ts)
   İş mantığını ve kuralları yönetir. (Örnekler)

Kayıt işlemi sırasında email kontrolü ve token oluşturma.

Şifre kontrolü, token revizyonları ve güvenlik adımları.

Kullanıcının giriş yaptığı cihazları ve IP'leri izleme.

Refresh token çalınması veya kötüye kullanımı durumunda güvenlik önlemleri.

3. Repository Katmanı (repositories/auth.repository.ts)
   MongoDB ile veri alışverişini yapar.

findByEmail, findById, createUser, updateLastLogin gibi CRUD işlemleri burada.

Ayrıca token.repository.ts dosyası:

Refresh token'ları veritabanına kaydeder.

Refresh token'ın süresini kontrol eder, günceller veya iptal eder.

🧩 Modülde Kullanılan Yapılar

Yapı Açıklama
JWT Kimlik doğrulama için access ve refresh token üretimi.
Bcrypt Şifrelerin güvenli şekilde hashlenmesi.
Cookies Access ve Refresh Token'ların güvenli saklanması.
Token Hashing Refresh token'lar veritabanında hashlenmiş şekilde tutulur.
IP ve User-Agent Kontrolü Şüpheli girişleri algılamak ve engellemek için kullanılır.
Yup veya Joi DTO validasyonları yapılır.
🛡️ Güvenlik Özellikleri
Token Versioning: Kullanıcı her giriş yaptığında refresh token versiyonu artırılır.

Çoklu Cihaz Takibi: Refresh token'lar IP ve cihaz bilgileriyle birlikte saklanır.

Şüpheli Aktivite Algılama: IP veya User-Agent değişimi algılanır, riskli durumlarda tüm token'lar iptal edilir.

Şifre Reset Token Süresi: Sadece belirli bir süre içinde kullanılabilir (örneğin 1 saat).

🔥 Kullanım Örnekleri
Kayıt Ol (Register)
http
Kopyala
Düzenle
POST /auth/register
Content-Type: application/json

{
"name": "John Doe",
"email": "john@example.com",
"password": "SecurePassword123"
}
Email Doğrulama
http
Kopyala
Düzenle
GET /auth/verify-email?token=xxx
Giriş Yap (Login)
http
Kopyala
Düzenle
POST /auth/login
Content-Type: application/json

{
"email": "john@example.com",
"password": "SecurePassword123"
}
Refresh Token
http
Kopyala
Düzenle
POST /auth/refresh
(Refresh token cookie içinde gönderilir)
📦 Önemli Bağımlılıklar
jsonwebtoken – JWT oluşturma ve doğrulama

bcrypt – Şifre hashleme

express-validator / joi – Validasyon

cookie-parser – Cookie okuma/yazma

mongoose – MongoDB ORM

📑 Geliştirme Notları
Erişim güvenliği için Access Token 10 dakika geçerlidir.

Refresh Token 7 gün geçerlidir.

Refresh Token, veritabanında SHA-256 ile hashlenmiş olarak saklanır.

Giriş yapıldığında eski refresh token'lar iptal edilir.

E-posta ile gelen doğrulama ve sıfırlama token'ları süreye tabidir.

✅ Özet
Bu modül, sistemin kullanıcı kimlik doğrulamasını, güvenli oturum yönetimini ve kullanıcı güvenliğini sağlamak için tasarlanmıştır.
Kendi içinde modüler, genişletilebilir ve güvenli bir yapıya sahiptir.
