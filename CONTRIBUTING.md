Projeye Katkıda Bulunma Rehberi
Bu projeye katkıda bulunmak isteyen herkes için aşağıdaki adımlara uyulması zorunludur.
Amaç: Kod kalitesini, proje bütünlüğünü ve geliştirme hızını korumak.

📚 Ön Bilgilendirme
Projede TypeScript kullanıyoruz.

MongoDB + Mongoose ORM kullanıyoruz.

Tüm API işlemleri async/await ile yapılır.

Validasyon için Joi kullanılır.

Hata yönetimi için AppError standardı kullanılır.

Kuyruk yönetimi için BullMQ kullanılır.

Lütfen mevcut README.md ve modül bazlı README'leri okuyarak katkı yap.

🛠️ Katkı Süreci

1. Forkla
   Projeyi kendi GitHub hesabına fork et.

2. Clone'la
   Forkladığın repoyu kendi bilgisayarına indir:

bash
Kopyala
Düzenle
git clone https://github.com/{senin-kullanıcı-adın}/{proje-ismi}.git 3. Branch Aç
Yeni bir özellik veya düzeltme yaparken yeni branch aç:

bash
Kopyala
Düzenle
git checkout -b feature/{modül_adı}-{özellik_adı}
Örnek:

bash
Kopyala
Düzenle
feature/auth-forgot-password
feature/application-resend-otp 4. Kodla
Kurallara uy:

Dosya yapısına sadık kal.

Service → Repository → Controller sırasını koru.

DTO ve validasyon şemalarını ekle.

Tüm kodlar async/await olmalı.

Hataları AppError ile yönet.

Dead-code bırakma, gereksiz console.log sil.

5. Test Et
   Kod değişikliği yapınca:

bash
Kopyala
Düzenle
npm run lint
npm run test
Manuel testler de yap (Postman ile).

Response body'leri ve hata mesajlarını kontrol et.

6. Commit Mesajı Yaz
   Temiz, anlamlı commit mesajı yaz:

bash
Kopyala
Düzenle
✅ auth: forgot password flow completed
🐛 application: fix otp resend bug
➕ aiAnalysis: add average scoring logic 7. Push ve PR Aç
Branch'i pushla:

bash
Kopyala
Düzenle
git push origin feature/{modül_adı}-{özellik_adı}
Github'da PR (Pull Request) aç:

Base branch → develop

Açıklayıcı bir PR mesajı yaz.

Değişen dosyaları ve test senaryolarını belirt.

8. Review Bekle
   Bir ekip üyesinden review iste.
   En az 1 onay alınca PR merge edilir.

🚨 Dikkat Etmen Gerekenler

Konu Açıklama
Hatalar AppError kullan. try-catch zorunlu.
Validasyon Tüm requestler DTO ve Joi şeması ile validasyonlanır.
Lint Kuralları npm run lint ile kod hatalarını temizle.
Açıklayıcı Kod Fonksiyonlar ve sınıflar net isimlendirilmiş olmalı.
Dokümantasyon Eğer yeni API ekliyorsan ilgili README güncellenmeli.
🧠 Neyi Ne Zaman Yapmalı?

Senaryo Yapılacak
Yeni özellik ekliyorsan Yeni branch aç, kodla, PR aç.
Mevcut modülde küçük hata bulduysan Fix branch aç, kodla, PR aç.
Büyük refactor yapıyorsan PM ile mutlaka önce onay al.

📜 Kısaca Özet Akış
Fork → Clone → Branch → Kodla → Test → Push → PR → Review → Merge
