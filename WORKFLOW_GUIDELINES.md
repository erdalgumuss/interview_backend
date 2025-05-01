Çalışma Akışı Kuralları
Bu doküman, projede görevlerin nasıl alınıp işleneceğini, kodun nasıl yazılıp teslim edileceğini ve ekibe nasıl PR (Pull Request) gönderileceğini adım adım açıklar.

🚀 Görev Alımı
Sprint Tahtası üzerinde size atanan görevi alın.

Görev açıklamasını tam okuyun, eksik veya net olmayan yer varsa anında PM ile iletişime geçin.

"Ready to Start" statüsüne geçirin.

🔨 Geliştirme Süreci
Branch Açılması

feature/{modül_adı}-{özellik_adı} formatında branch açılır.

Örnek:

bash
Kopyala
Düzenle
feature/auth-refresh-token
feature/application-otp-verification
Geliştirme Yaparken

İlgili DTO'ları ve validasyonları eksiksiz oluştur.

Service → Repository → Controller sırasına uy.

Orijinal dosya yapısına %100 sadık kal.

Eğer hata durumları gerekiyorsa AppError yapısını kullan.

Eğer yeni endpoint ekliyorsan README'ye mutlaka güncelleme yap.

Kod bitince npm run lint ve npm run test komutlarını çalıştır. (Kod hatasız geçmeli.)

🧪 Test Süreci
Manuel Testler

Postman veya Swagger üzerinden endpoint testleri yapılır.

Özellikle edge-case'leri test et (örneğin: geçersiz ID, eksik parametre).

Unit Test (Varsa)

Servis seviyesinde kritik fonksiyonlar için unit test eklenir.

Jest kullanıyoruz (src/tests/unit/... altında).

Integration Test (Varsa)

API endpointleri uçtan uca test etmek için integration testler kullanılır.

🔥 Pull Request Açılması
Bitirdiğin branch’te son commit'i at:

sql
Kopyala
Düzenle
git add .
git commit -m "✅ {özellik_adı} tamamlandı"
Branch'ı remote'a pushla:

bash
Kopyala
Düzenle
git push origin feature/auth-refresh-token
Github üzerinden PR aç:

Base: develop

Compare: kendi feature branch'in

PR açıklamasında şunları yaz:

Özellik özeti (ne yaptın?)

Hangi dosyalar değişti?

Test senaryoları nelerdir?

Ek notlar (eğer breaking change varsa)

PR'da minimum 1 developer review almak zorunludur.

🧹 Merge ve Cleanup
PR onaylandıktan sonra develop branch'ine merge yapılır.

Merge sonrası kendi feature branch'ini sil:

bash
Kopyala
Düzenle
git branch -d feature/auth-refresh-token
git push origin --delete feature/auth-refresh-token
🚨 Önemli Hatırlatmalar

Kural Açıklama
console.log() Prod kodda bırakılmaz. Sadece debug aşamasında kullanılır.
async/await Tüm async işlemler await edilir. Unutulan await yok!
Try-Catch Her async fonksiyon içinde try-catch zorunludur.
Error Handling Hatalar AppError ile proper şekilde fırlatılır.
Validasyon Her istek DTO + Joi validator ile kontrol edilir.
Kod Temizliği Dead-code, yorum satırı bırakılmaz. Her dosya temiz olmalı(versiyonlama aşamasında geçerli).
📦 Özet Akış

`***Görev al → Branch aç → Kodla → Test et → PR aç → Review al → Merge → Temizlik yap***`
