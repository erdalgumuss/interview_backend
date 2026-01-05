ADAY YÖNETİMİ — BACKEND ENDPOINT İHTİYAÇ LİSTESİ

(Mevcut interview + reports + HR actions yapısı korunarak)

Aşağıdaki endpoint’ler şu anki backend’te yoksa eklenmelidir.

1️⃣ Aday Listeleme (Candidate Pool)
🔹 Aday Havuzu – Liste Sayfası (core)
GET /api/candidates


Zorunlu desteklenecek query parametreleri:

positionIds[]

minInterviewCount

maxInterviewCount

lastInterviewAfter

lastInterviewBefore

minOverallScore

maxOverallScore

minTechnicalScore

minCommunicationScore

onlyFavorites

status[] // active, reviewed, shortlisted, archived

sortBy // lastInterview | score | createdAt

sortOrder // asc | desc

page

pageSize

UI bu endpoint olmadan çalışamaz.

2️⃣ Favori Aday İşlemleri (candidate-level)
🔹 Favoriye ekleme
POST /api/candidates/:candidateId/favorite

🔹 Favoriden çıkarma
DELETE /api/candidates/:candidateId/favorite

🔹 Favori adayları filtreleme (liste endpoint’i ile uyumlu)
GET /api/candidates?onlyFavorites=true

3️⃣ Aday Detay Sayfası
🔹 Genel aday profili
GET /api/candidates/:candidateId


Genel bilgiler + aggregate skor özeti

4️⃣ Adayın Mülakat Geçmişi
🔹 Adaya ait tüm mülakatlar
GET /api/candidates/:candidateId/interviews


Interview modal’ı açmak için interviewId döndürmesi yeterlidir
Yeni mülakat detayı endpoint’i gerekmez

5️⃣ Aday Skor Geçmişi / Trend (UI opsiyonel ama backend gerekli)
GET /api/candidates/:candidateId/score-trend


Zaman bazlı skor değişimi
(reports/time-trends ile karışmaz, candidate-level)

6️⃣ HR Notları (candidate-level write)
🔹 Notları listeleme
GET /api/candidates/:candidateId/notes

🔹 Yeni not ekleme
POST /api/candidates/:candidateId/notes

7️⃣ Rejected / Archived Aday Yönetimi
🔹 Adayı arşivleme (soft)
PATCH /api/candidates/:candidateId/status
{
  status: "archived"
}

🔹 Arşivden çıkarma (opsiyonel ama önerilir)
PATCH /api/candidates/:candidateId/status
{
  status: "active"
}

8️⃣ Olası Aynı Aday (Duplicate Detection – read-only)
🔹 Olası eşleşme uyarısı için
GET /api/candidates/:candidateId/potential-duplicates


UI sadece uyarı gösterir
Otomatik merge yok

9️⃣ Aday Birleştirme (Manual Merge)
🔹 HR onayı ile birleştirme
POST /api/candidates/:candidateId/merge
{
  targetCandidateId
}


Interview’ler korunur
E-postalar alias olur
Source candidate archived edilir

🔟 Dashboard entegrasyonu için küçük ama kritik destek
🔹 Son favori adaylar (dashboard için limitli)
GET /api/candidates?onlyFavorites=true&limit=3

🧾 TOPLAM: EKSİK OLABİLECEK ENDPOINT SETİ

Okuma (GET):

/api/candidates

/api/candidates/:id

/api/candidates/:id/interviews

/api/candidates/:id/score-trend

/api/candidates/:id/notes

/api/candidates/:id/potential-duplicates

Yazma (POST / PATCH / DELETE):

/api/candidates/:id/favorite

/api/candidates/:id/notes

/api/candidates/:id/status

/api/candidates/:id/merge