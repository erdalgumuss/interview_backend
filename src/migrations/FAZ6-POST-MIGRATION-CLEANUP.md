# FAZ 6.2 - Post-Migration Cleanup Checklist

Bu dosya, FAZ 6.1 migration script'i başarıyla çalıştırıldıktan SONRA yapılması gereken temizlik adımlarını içerir.

## ⚠️ ÖNEMLİ

Bu temizlik işlemleri **SADECE** aşağıdaki koşullar sağlandıktan sonra yapılmalıdır:

1. ✅ Migration script (`faz6-candidate-migration.ts`) production'da başarıyla çalıştırıldı
2. ✅ Tüm mevcut Application'lar candidateId ile backfill edildi
3. ✅ Yeni kod yeterli süre test edildi (önerilen: en az 1 sprint)
4. ✅ Database backup alındı

---

## Checklist

### 1. Application Model - Deprecated Alanların Kaldırılması

Aşağıdaki alanlar Application modelinden kaldırılabilir:

```typescript
// src/modules/application/models/application.model.ts

// KALDIRILACAK ALANLAR:
- candidate: ICandidateProfile  // candidateId kullanılacak
- education: ICandidateEducation[]  // Candidate modülüne taşındı (ileride)
- experience: ICandidateExperience[]  // Candidate modülüne taşındı (ileride)  
- skills: ICandidateSkills  // Candidate modülüne taşındı (ileride)
- documents: ICandidateDocuments  // Candidate modülüne taşındı (ileride)
- generalAIAnalysis: IGeneralAIAnalysis  // AIAnalysis modülü source of truth

// KALDIRILACAK INDEXLER:
- ApplicationSchema.index({ 'candidate.email': 1 });
```

### 2. Interface Temizliği

Kaldırılacak interface'ler:
- `ICandidateProfile` (Application modülündeki)
- `ICandidateEducation` (Application modülündeki)
- `ICandidateExperience` (Application modülündeki)
- `ICandidateSkills` (Application modülündeki)
- `ICandidateDocuments` (Application modülündeki)
- `IGeneralAIAnalysis` (Application modülündeki)

### 3. Repository Metotları

Kontrol edilecek ve gerekirse kaldırılacak metotlar:

```typescript
// src/modules/application/repositories/candidate.repository.ts
// Artık Application yerine Candidate servisini kullanmalı:
- getApplicationByEmailAndInterview() -> Email kontrolü artık Candidate üzerinden

// src/modules/candidates/services/candidate.service.ts
// Deprecated sync metodu:
- syncFromApplication() -> KALDIRILACAK (ensureCandidateIdentity + linkApplication kullanılmalı)
```

### 4. Service Güncellemeleri

```typescript
// src/modules/application/services/candidate.service.ts
// createApplication içindeki eski candidate field kullanımları kaldırılabilir

// src/modules/candidates/services/candidate.service.ts
// updateScoreSummary artık generalAIAnalysis okumayacak - AIAnalysis source of truth
```

### 5. Sorgu Güncellemeleri

Migration sonrası aşağıdaki sorgular değişmeli:

```typescript
// ESKİ:
Application.find({ 'candidate.email': email })

// YENİ:
const candidate = await Candidate.findOne({ primaryEmail: email });
Application.find({ candidateId: candidate._id });
```

### 6. Test Güncellemeleri

- Application model testleri güncellenmeli
- Candidate modül testleri eklenmeli
- Integration testler candidate-application ilişkisini test etmeli

---

## Uygulama Sırası

1. Feature branch oluştur: `git checkout -b refactor/faz6-cleanup`
2. Yukarıdaki değişiklikleri yap
3. Testleri çalıştır ve güncelle
4. Staging'e deploy et ve test et
5. Production'a deploy et

---

## Rollback Planı

Eğer temizlik sonrası sorun çıkarsa:

1. Application model'deki deprecated alanlar hala schema'da
2. Migration verisi (candidateId backfill) korunuyor
3. Eski sorguları geri getirmek için sadece kod değişikliği yeterli

---

## Notlar

- Bu temizlik işlemi breaking change içermiyor çünkü yeni alanlar (candidateId) zaten mevcut
- Geriye uyumluluk için deprecated alanlar okunabilir kalmaya devam edebilir
- Frontend değişikliği gerekmez - API response'ları aynı kalabilir
