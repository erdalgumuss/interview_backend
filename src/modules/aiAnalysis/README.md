AI Analysis Modülü - Video Yanıtlarının AI Analizi
Bu modül, adayların video yanıtlarını AI sunucusuna göndererek analiz ettirir
ve sonuçları sistemimize kaydeder. Ayrıca, başvuru bazında genel bir analiz özeti çıkarır.

🎯 Modülün Amaçları
Adayın her video yanıtını AI modeline gönderip detaylı analiz almak.

AI analizi sonuçlarını veritabanında saklamak.

Başvuruya özel genel (ortalama) AI özet raporları oluşturmak.

İK ekibine her aday için güçlü yönler, zayıf yönler ve öneriler sunmak.

📚 Kapsadığı Ana Fonksiyonlar

Fonksiyon Açıklama
analyzeSingleVideo(videoResponseId) Bir video için AI analizi yapar ve sonucu kaydeder.
calculateGeneralAIAnalysis(applicationId) Bir başvurunun tüm analizlerini birleştirir ve genel bir rapor oluşturur.
🛠️ Yapı ve Akış

1. AIAnalysisService (services/aiAnalysis.service.ts)
   analyzeSingleVideo(videoResponseId)

İlgili video yanıtı bulunur.

Video hangi başvuruya ve hangi soruya ait belirlenir.

Video + soru + mülakat bilgileri alınır ve dış AI sunucuya JSON formatında gönderilir.

Dönen sonuçlar:

transkripsiyon (speech-to-text)

çeşitli skorlamalar (teknik yetenek, iletişim vs.)

anahtar kelime eşleşmeleri

güçlü yönler ve gelişim alanları

genel öneriler

Sonuçlar AIAnalysis koleksiyonuna kaydedilir.

Aynı zamanda Application'daki ilgili soru cevabı güncellenir (text olarak).

calculateGeneralAIAnalysis(applicationId)

Bir başvuruya ait tüm video analiz sonuçları toplanır.

Ortalama skorlar hesaplanır.

Güçlü yönler (strengths) ve gelişim alanları (improvement areas) birleştirilir.

Genel tavsiye metni oluşturulur.

Başvuru kaydına generalAIAnalysis alanı olarak işlenir.

🧩 Kullanılan Yapılar

Yapı Açıklama
Axios AI sunucusuna HTTP POST ile istek gönderir.
Mongoose Modelleri VideoResponseModel, ApplicationModel, InterviewModel, AIAnalysisModel kullanılır.
Error Handling Her kritik adımda özel hata fırlatılır (AppError).
Environment Variable AI sunucu URL'i .env dosyasından alınır (AI_SERVER_URL).
🛡️ Güvenlik ve Dayanıklılık Önlemleri
AI sunucusuna istek atılamazsa hata loglanır ve 503 döndürülür.

İlgili başvuru, video veya soru bulunamazsa özel 404 hatası döner.

AI'dan alınan her sonuç detaylı kontrol edilip veritabanına güvenli şekilde kaydedilir.

🎬 Genel AI Analizi Süreci
mermaid
Kopyala
Düzenle
sequenceDiagram
Aday ->> Sunucu: Video yükler
Sunucu ->> AIAnalysisService: Kuyruğa ekler (async)
AIAnalysisService ->> AI Server: POST analyzeVideo (videoUrl + soru + mülakat bilgisi)
AI Server -->> AIAnalysisService: AI analiz sonucu JSON
AIAnalysisService ->> MongoDB: AI sonucu kaydeder
AIAnalysisService ->> Application: Başvuru kaydını günceller
🛠️ Kullanım Örnekleri
Tek Bir Videoyu Analiz Etmek
typescript
Kopyala
Düzenle
const aiService = new AIAnalysisService();
await aiService.analyzeSingleVideo('VIDEO_RESPONSE_ID');
Bir Başvuruya Ait Genel AI Analizi Çıkarmak
typescript
Kopyala
Düzenle
const aiService = new AIAnalysisService();
await aiService.calculateGeneralAIAnalysis('APPLICATION_ID');
📦 Önemli Bağımlılıklar
axios – Dış AI servisi ile haberleşmek için.

mongoose – Veritabanı işlemleri için.

dotenv – Ortam değişkenlerini almak için.

✅ Özet
AI Analysis Modülü, video yanıtlar üzerinde gelişmiş bir AI tabanlı analiz süreci sağlar.
Bu analizler sayesinde İK ekibi, adayların hem teknik hem de iletişim becerilerini nesnel verilerle değerlendirebilir.

İlerleyen aşamalarda sistem:

Gerçek zamanlı kuyruk bazlı analiz

Otomatik bilgilendirme sistemleri

Daha ileri düzey raporlama panelleri ile güçlendirilecektir.
