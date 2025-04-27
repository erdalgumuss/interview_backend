Application Modülü - Başvuru ve Aday İşlemleri
Bu modül, adayların mülakat başvurularını, OTP doğrulamalarını, kişisel bilgilerinin güncellenmesini ve İK tarafında başvuruların görüntülenmesini yönetir.

🎯 Modülün Amaçları
Adayların mülakat başvurusu yapmasını sağlamak.

Telefon doğrulaması (OTP) ile başvuruları güvenceye almak.

Adayın eğitim, deneyim ve yetenek bilgilerini toplamak.

İK yetkililerinin başvuruları güvenli şekilde inceleyebilmesini sağlamak.

📚 Kapsadığı Ana Fonksiyonlar

Endpoint Açıklama
GET /api/public/interview/:interviewId Mülakat bilgilerini aday ile paylaşır.
POST /api/public/ Adayın başvuru yapmasını sağlar. (OTP başlatılır)
POST /api/public/verifyOtp Adayın OTP kodu ile başvurusunu doğrular.
POST /api/public/resendOtp Adaya yeni bir OTP kodu gönderir.
PUT /api/public/update Adayın kişisel bilgilerini günceller.
GET /api/application/:id (İK) Belirli bir başvurunun detaylarını getirir.
🛠️ Yapı ve Akış

1. CandidateController (controllers/candidate.controller.ts)
   Adayların (kamuya açık) erişebildiği işlemleri yönetir:

getPublicInterview: Mülakat bilgilerini getirir.

createApplication: Yeni başvuru oluşturur, OTP gönderir.

verifyOtp: Adayın telefon numarasını doğrular.

resendOtp: Adaya yeni OTP kodu yollar.

updateCandidateDetails: Adayın eğitim, deneyim ve beceri bilgilerini günceller.

2. ApplicationController (controllers/application.controller.ts)
   İK tarafı işlemlerini yönetir:

getApplicationById: Yalnızca mülakatı oluşturmuş kullanıcı başvuru detayını görebilir.

3. Service Katmanı
   candidate.service.ts: Aday tarafı işlemlerini yürütür (başvuru oluşturma, otp doğrulama, detay güncelleme).

application.service.ts: İK tarafı başvuru erişim kontrolü ve detay çekimi.

4. Repository Katmanı
   candidate.repository.ts: Aday başvuru kayıtlarını ve güncellemeleri yapar.

application.repository.ts: İK tarafı sorgularını (başvuru detayları, listeler) yönetir.

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
