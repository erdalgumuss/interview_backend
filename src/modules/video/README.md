Video Modülü - Aday Video Yanıtları Yönetimi
Bu modül, adayların mülakat sorularına verdiği video yanıtlarının yönetilmesinden sorumludur.

🎯 Modülün Amaçları
Adayların mülakat sorularına verdikleri video yanıtlarını sisteme yüklemesini sağlamak.

Video yanıtlarının güvenli bir şekilde kaydedilmesini sağlamak.

İleride AI analiz için gerekli video verilerini hazırlamak.

Adayın kendi yüklediği videoları listeleyebilmesini sağlamak.

📚 Kapsadığı Ana Fonksiyonlar

Endpoint Açıklama
POST /api/video/upload Adayın belirli bir soruya verdiği video yanıtını yüklemesini sağlar.
GET /api/video/ Adayın yüklediği tüm video yanıtlarını listeler.
🛠️ Yapı ve Akış

1. VideoResponseController (controllers/videoResponse.controller.ts)
   uploadVideoResponse:

Adaydan gelen video verisini alır.

Doğrulamalar yapılır (application ID kontrolü, video formatı, süre kontrolü vs.).

Video sistemde kaydedilir.

getVideoResponses:

Adayın sisteme yüklediği tüm videoları döner.

2. VideoResponseService (services/videoResponse.service.ts)
   uploadVideoResponse:

Gelen videonun tüm iş kurallarını kontrol eder:
(Geçerli başvuru, geçerli soru, video URL doğrulama, süre kontrolü, daha önce yüklenmiş mi?)

Kaydı videoResponseRepository ile veritabanına kaydeder.

Eğer aday tüm sorulara cevap verdiyse, başvuru completed olarak işaretlenir.

getVideoResponses:

Adayın yüklediği tüm videoları döner.

3. VideoResponseRepository (repositories/videoResponse.repository.ts)
   saveVideoResponse:

Yeni video kaydı oluşturur.

getVideoResponsesByApplication:

Bir başvuruya ait tüm videoları listeler.

getVideoResponseByQuestion:

Belirli bir soru için daha önce yüklenmiş video var mı kontrol eder.

updateVideoStatus:

Video AI tarafından işlendiyse durumunu processed yapar.

🧩 Modülde Kullanılan Yapılar

Yapı Açıklama
JWT Authentication (Aday) Videoyu sadece kendi başvurusuna ait aday yükleyebilir.
DTO Validasyonları Gelen video bilgileri (applicationId, questionId, videoUrl, duration) kontrol edilir.
MongoDB İlişkileri Her video applicationId ve questionId ile bağlantılıdır.
Cloud Storage Doğrulaması Yüklenen video URL'leri sadece güvenilir bir storage (örneğin AWS S3) formatında kabul edilir.
🛡️ Güvenlik Önlemleri
Sadece JWT ile doğrulanan aday kendi videolarını yükleyebilir.

Bir soruya sadece bir kez video yüklenebilir. (Çifte kayıt engellenir.)

Video URL formatı regex ile doğrulanır (S3/Cloudfront zorunlu).

Video süresi > 0 olmalı (boş video yüklemesi engellenir).

API rate limit mekanizması üstteki aday auth middleware'de tetiklenebilir.

🎬 Aday Perspektifinden Video Yükleme Akışı
mermaid
Kopyala
Düzenle
sequenceDiagram
Aday ->> Sunucu: POST /api/video/upload (videoUrl, questionId, duration)
Sunucu -->> Aday: 201 Created (Video kaydı yapıldı)
Sunucu ->> Kuyruk Sistemi: Video AI Analizi için kuyruğa eklenir
🛠️ Kullanım Örnekleri
Video Yüklemek
http
Kopyala
Düzenle
POST /api/video/upload
Authorization: Bearer <AdayToken>
Content-Type: application/json

{
"questionId": "QUESTION_ID",
"videoUrl": "https://s3.amazonaws.com/bucket/video.mp4",
"duration": 75
}
Tüm Videoları Listelemek
http
Kopyala
Düzenle
GET /api/video
Authorization: Bearer <AdayToken>
📦 Önemli Bağımlılıklar
express – API rotalarını tanımlar.

joi – DTO ve veri validasyonları.

mongoose – MongoDB işlemleri için ORM.

jsonwebtoken – Aday kimlik doğrulama.

multer / s3 client (gelecekte) – Video upload/indirme işlemleri için.

✅ Özet
Video modülü, adayların mülakat sorularına verdikleri video yanıtlarını sistemde güvenli şekilde saklar.
Aynı zamanda bu videolar AI analiz sistemi için hazır hale getirilir.
İleride videoların işlenme süreci kuyruk bazlı yönetilecek ve gerçek zamanlı analiz güncellemeleri yapılacaktır.
