REPORTS MODÜLÜ — BACKEND TASARIM DOKÜMANI

(Mevcut interview / AI mimarisiyle uyumlu)

0) TASARIM FELSEFESİ (çok önemli)

Reports modülü:

❌ aday detayı vermez

❌ video / metin / AI raw output taşımaz

✅ sadece toplu istatistik üretir

Interview & AI servisleri source of truth olmaya devam eder

Reports servisi:

ya ayrı bir servis

ya da mevcut backend içinde /reports namespace’i

Hesaplama mümkün olduğunca:

önceden (batch)

cache’li
yapılır

1) VERİ KAYNAKLARI (mevcut yapıyı referans alarak)

Reports endpoint’leri şu tablolardan / koleksiyonlardan BESLENİR:

interviews

interview_questions

ai_interview_analysis

ai_question_analysis

hr_actions

favorites

tags

positions

reviewers (HR users)

👉 candidate table doğrudan kullanılmaz
(candidate_id sadece count / group için)

2) GENEL ENDPOINT TASARIMI

Tüm rapor endpoint’leri şu şablonu izler:

GET /reports/{report_type}


Ortak query parametreleri (tüm endpoint’lerde):

?position_ids=1,2,3
&start_date=2024-01-01
&end_date=2024-03-31
&reviewer_ids=5,7
&tags=strong,medium
&only_favorites=true


⚠️ Bu filtre seti tek tip olmalı.
Frontend her grafikte yeniden öğrenmemeli.

3) RAPOR ENDPOINT’LERİ (çekirdek set)

Aşağıda Rapor UI dokümanındaki her blok için karşılık gelen endpoint’leri veriyorum.

3.1 Özet KPI Şeridi
GET /reports/summary


Response:

{
  "total_interviews": 124,
  "evaluated_interviews": 117,
  "favorite_ratio": 0.23,
  "avg_role_fit": 0.68,
  "avg_interview_duration_sec": 1420
}


Kaynak:

interviews

ai_interview_analysis

hr_actions

3.2 Pozisyon Bazlı Aday Dağılımı
GET /reports/position-distribution


Response:

{
  "positions": [
    {
      "position_id": 1,
      "position_name": "Backend Developer",
      "distribution": {
        "high_fit": 18,
        "medium_fit": 42,
        "low_fit": 27
      }
    }
  ]
}


Not:

Fit bucket’ları backend tanımlar

Frontend hesap yapmaz

3.3 Rol Yakınlığı & Yetkinlik Dağılımı
GET /reports/fit-distribution


Response:

{
  "role_fit_buckets": [
    { "range": "0-0.3", "count": 12 },
    { "range": "0.3-0.6", "count": 39 },
    { "range": "0.6-1.0", "count": 51 }
  ],
  "skill_scatter": [
    { "communication": 0.7, "technical": 0.8 },
    { "communication": 0.4, "technical": 0.9 }
  ]
}

3.4 Soru Bazlı Ayırt Edicilik Raporu
GET /reports/question-effectiveness


Response:

{
  "questions": [
    {
      "question_id": "Q2",
      "question_title": "Problem solving approach",
      "variance_score": 0.42,
      "avg_answer_duration_sec": 95,
      "analysis_completion_rate": 0.97
    }
  ]
}


variance_score = adayları ayırma gücü
(detaylı formül UI’ya çıkmaz)

3.5 AI – HR Uyum Analizi
GET /reports/ai-hr-alignment


Response:

{
  "overlap_ratio": 0.64,
  "ai_only_high": 14,
  "hr_only_favorite": 9,
  "both_high": 27
}


Kaynak:

ai_interview_analysis.fit_score

hr_actions.favorite

3.6 Zaman Bazlı Trendler
GET /reports/time-trends


Query ek parametre:

&interval=weekly


Response:

{
  "trend": [
    {
      "period": "2024-W01",
      "avg_role_fit": 0.62,
      "favorite_ratio": 0.18
    },
    {
      "period": "2024-W02",
      "avg_role_fit": 0.66,
      "favorite_ratio": 0.24
    }
  ]
}

4) PERFORMANS & CACHE STRATEJİSİ

Önerilen yaklaşım:

Reports endpoint’leri:

Redis / memory cache

TTL: 1 saat (opsiyonel 24 saat)

Heavy hesaplamalar:

nightly job (cron / worker)

reports_daily_snapshot tablosu

Bu sayede:

Dashboard hızlı açılır

AI servisine yük binmez

5) GÜVENLİK & YETKİ

Tüm /reports endpoint’leri:

HR role required

Reviewer bazlı filtre:

sadece yetkili HR’ler görür

Candidate PII:

response’larda YOK

Bu, regülasyon açısından güçlü bir argüman.

6) VERSİYONLAMA & SÜRDÜRÜLEBİLİRLİK

Öneri:

/reports/v1/summary
/reports/v1/position-distribution


Yeni metrik eklendiğinde:

v1 bozulmaz

v2 açılır