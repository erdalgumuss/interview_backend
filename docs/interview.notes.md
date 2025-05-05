🔐 Erişim ve Yetkilendirme Kuralları
Roller ve Erişim:
Rol Açıklama Erişim Sağladığı Endpointler
admin Tüm mülakatları görüntüleyebilir. GET /api/interview/all
auth user Kendi oluşturduğu mülakatları yönetir. create, update, delete, patch, link, questions
unauthenticated Mülakat göremez/oluşturamaz. ❌ Hiçbir erişim yok

🔄 Mülakat Durumları ve Geçiş Kuralları
Geçerli Durum Yeni Durum Geçiş İzin Verilir mi? Açıklama
draft published ✅ Taslaktan yayına alım
published inactive ✅ Aktif mülakatı kapatma
published completed ❌ Kullanıcı tarafından yapılamaz
inactive published ❌ Tekrar açmak şu an desteklenmiyor

❗ Not: Bu geçişler PUT /api/interview/:id/status endpoint’iyle yapılır.

🧪 Test Kullanıcıları ve Rolleri
Geliştirme sürecinde kullanılmak üzere sahte kullanıcı ve token bilgileri:

ts
Kopyala
Düzenle
// HR Kullanıcısı (Giriş yapılmış, mülakat oluşturabilir)
{
"id": "6655a53e3a2b4c001c5f9321",
"role": "user",
"token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..."
}

// Admin Kullanıcısı
{
"id": "6655a53e3a2b4c001c5f9000",
"role": "admin",
"token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..."
}

// Geçersiz Kullanıcı
{
"token": "Bearer INVALID"
}
🎯 Kullanım Senaryoları
Senaryo 1: Yeni Mülakat Oluşturma
Kullanıcı /api/interview/create endpoint’ine POST isteği atar.

Sunucu mülakatı oluşturur ve status = active olarak işaretler.

Kullanıcı /api/interview/:id üzerinden detayları görüntüleyebilir.

Senaryo 2: Taslak Mülakat Yayına Alma
Mevcut draft durumundaki mülakat için PUT /api/interview/:id/status çağrılır.

Yeni durum "published" olarak ayarlanır.

Link oluşturmak için PATCH /api/interview/:id/link çağrısı yapılır.

Senaryo 3: Sorular Güncelleme
HR kullanıcı, PATCH /api/interview/:id/questions ile yeni bir soru listesi gönderir.

Sistem doğrudan tüm soruları override eder.
