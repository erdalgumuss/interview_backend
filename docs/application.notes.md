Bu döküman, Application modülüne ait iş kuralları, önemli senaryolar, edge case'ler, veri akışları ve geliştirme notlarını içerir.

📌 Genel Tanım
Application modülü, bir adayın sistemde belirli bir mülakat için yaptığı başvuru sürecini ve ilişkili verileri (kişisel bilgiler, eğitim, deneyim, beceriler, video yanıtlar, kişilik testleri, AI analizleri vs.) yönetir.

🧩 Ana Bileşenler
ApplicationModel: Başvurunun temel kaydı

CandidateProfile: Adayın kişisel ve geçmiş bilgileri

VideoResponse: Adayın video yanıtları (ayrı modelde tutulur)

AIAnalysis: Her video için yapılan AI analizleri (ayrı modelde tutulur)

PersonalityTestResults: Kişilik test sonucu

GeneralAIAnalysis: Mülakat genel analizi (opsiyonel)

🧠 Önemli İş Kuralları

1. ✅ Adayın aynı mülakata birden fazla başvuru yapması engellenir
   candidate.email + interviewId kombinasyonu kontrol edilir

2. 📱 Telefon numarası doğrulanmadan mülakata başlanamaz
   phoneVerified === true kontrolü yapılır

OTP süresi geçerse yeni OTP gönderilir

3. 📄 Kişilik testi varsa önce tamamlanmalıdır
   interview.stages.personalityTest === true ise completed === true kontrolü yapılır

4. 📹 Video kayıtları frontend tarafından S3’e yüklenir
   Video linki backend'e kaydedilir

Aynı applicationId + questionId için birden fazla video yüklenemez

5. 🤖 Video başına AI analizi yapılır
   Video processed durumuna alınır

AI sonucu ayrı tabloda tutulur

Sonuç application.latestAIAnalysisId ile ilişkilendirilir

6. 🧾 Mülakat tamamlandıktan sonra status = completed yapılır
   Tüm video soruları tamamlandığında güncellenir

7. 📬 IK, sonucu değerlendirir ve accepted | rejected durumuna çeker
   Açıklama yazısı + hazır metin ile mail gönderilir

📦 Veri İlişkileri
text
Kopyala
Düzenle
Application
├── candidate (embedded)
├── interviewId (ref -> Interview)
├── videoResponses (via query)
├── aiAnalysisResults (ref -> AIAnalysis[])
├── latestAIAnalysisId (ref -> AIAnalysis)
└── personalityTestResults
🛠 Edge Case Senaryoları
🔁 Retry: allowRetry === true ve retryCount < maxRetryAttempts ise tekrar hakkı verilir

🚨 Kamera/Mikrofon test başarısız: Video yüklenemez, frontend engeller

⛔ Tam ekran ihlali: 3 kez çıkış sonrası mülakat sistem tarafından sonlandırılır

📥 AI kuyruğu gecikirse: Başvuru görünür ama analiz tamamlanmamıştır

🔐 Güvenlik ve Doğrulama
application.getById sadece mülakat sahibine açık

candidate.updatePersonalInfo sadece ilgili token ile yapılabilir

OTP kodları verificationExpiresAt süresine sahiptir ve erişimi sınırlıdır

📊 Performans Notları
applicationId ve candidate.email için index tanımlı

videoResponse.questionId + applicationId üzerinden hızlı erişim için index gerekir

AI analizleri latestAIAnalysisId ile doğrudan erişilebilir olmalı

🧪 Test Senaryoları
Aynı adaya aynı mülakat için ikinci başvuru yapılamaz

OTP kodu 10 dakikada zaman aşımına uğrar

Tüm videolar yüklendiğinde otomatik olarak status = completed olur

Kişilik testi varsa tamamlanmadan mülakata geçilemez

AI sonucu gelmeden başvuru değerlendirmeye açılmaz

📝 Geliştirme Notları
textAnswer artık sadece yazılı sorular için kullanılmaktadır

Her video ayrı modelde tutulur (normalize edildi)

generalAIAnalysis sadece özet AI sonucu içindir, detaylar AIAnalysisModel'de
