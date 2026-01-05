# Application & Candidate Refactor Summary

Bu belge, Application ve Candidate modüllerinin refactor işleminin özetini içerir.

## 📋 Uygulanan Değişiklikler

### FAZ 1 - MİMARİ KİLİTLEME

#### 1.1 Application Model Refactor
- ✅ `candidateId: ObjectId` alanı eklendi (foreign key to Candidate)
- ✅ `candidate` alanı deprecated olarak işaretlendi
- ✅ `education`, `experience`, `skills`, `documents` alanları deprecated
- ✅ `generalAIAnalysis` deprecated olarak işaretlendi
- ✅ `candidateId` index eklendi

#### 1.2 Candidate ↔ Application İlişki Kontratı
- ✅ Candidate modeline `lastInterviewTitle` cache alanı eklendi
- ✅ Modül sözleşmesi comment olarak eklendi
- ✅ Her modülün sorumlulukları netleştirildi

### FAZ 2 - WRITE PATH DÜZELTME

#### 2.1 Application → Candidate Sync Parçalama
- ✅ `ensureCandidateIdentity(email, profileData)` metodu eklendi
- ✅ `linkApplication(candidateId, applicationId, interviewId, title)` metodu eklendi
- ✅ `syncFromApplication` deprecated olarak işaretlendi
- ✅ `createApplication` güncellendi - yeni metodları kullanıyor

#### 2.2 Canonical Profile Koruması
- ✅ `ensureCandidateIdentity` mevcut candidate'ları overwrite ETMİYOR
- ✅ `updateCandidateProfile(candidateId, profileData, updatedBy)` HR-only metodu eklendi

### FAZ 3 - SCORE & AI AYRIŞMASI

#### 3.1 generalAIAnalysis Temizliği
- ✅ `calculateGeneralAIAnalysis` Application.generalAIAnalysis'i deprecated olarak güncelliyor
- ✅ AIAnalysis tamamlandığında Candidate.scoreSummary otomatik güncelleniyor

#### 3.2 scoreSummary Güncelleme
- ✅ `updateCandidateScoreSummary` private metodu eklendi
- ✅ Atomic field update kullanılıyor (weighted average)
- ✅ AIAnalysis completion event'i ile tetikleniyor

### FAZ 4 - MERGE VE REFERANS DÜZELTMELERİ

#### 4.1 Merge Sonrası Tutarlılık
- ✅ `mergeCandidates` Application.candidateId'leri güncelliyor
- ✅ Merged candidate endpoint'leri için `getMergeRedirectInfo` eklendi
- ✅ Transaction ile güvenli merge işlemi

### FAZ 5 - LISTING & PERFORMANCE

#### 5.1 N+1 Problemleri
- ✅ `listCandidates` cache'den `lastInterviewTitle` okuyor (N+1 çözümü)
- ✅ `getPositions` aggregation pipeline ile optimize edildi

#### 5.2 Index & Constraint
- ✅ `emailAliases.email` unique + sparse index
- ✅ `applicationIds` index eklendi
- ✅ `mergedInto` sparse index eklendi

### FAZ 6 - CLEANUP & MIGRATION

#### 6.1 Migration Script
- ✅ `faz6-candidate-migration.ts` oluşturuldu
- ✅ Batch processing ile verimli migration
- ✅ DRY_RUN modu destekleniyor
- ✅ Score summary recalculation dahil

#### 6.2 Final Temizlik
- ✅ `FAZ6-POST-MIGRATION-CLEANUP.md` checklist oluşturuldu
- ✅ Deprecated alanlar için temizlik planı dokümante edildi

---

## 🗂️ Değiştirilen Dosyalar

### Models
- `src/modules/application/models/application.model.ts`
- `src/modules/candidates/models/candidate.model.ts`

### Services
- `src/modules/application/services/candidate.service.ts`
- `src/modules/candidates/services/candidate.service.ts`
- `src/modules/aiAnalysis/services/aiAnalysis.service.ts`

### Migration
- `src/migrations/faz6-candidate-migration.ts` (YENİ)
- `src/migrations/FAZ6-POST-MIGRATION-CLEANUP.md` (YENİ)

---

## 🚀 Kullanım Kılavuzu

### Yeni Application Oluşturma Akışı
```typescript
// 1. Candidate identity sağla
const candidate = await candidateService.ensureCandidateIdentity(email, {
    name, surname, phone
});

// 2. Application oluştur
const app = await createApplication({
    candidateId: candidate._id,
    // ... diğer alanlar
});

// 3. İlişkiyi kur
await candidateService.linkApplication(
    candidate._id,
    app._id,
    interviewId,
    interviewTitle
);
```

### Migration Çalıştırma
```bash
# Test modu
DRY_RUN=true npx ts-node src/migrations/faz6-candidate-migration.ts

# Production
npx ts-node src/migrations/faz6-candidate-migration.ts
```

---

## ⚠️ Breaking Changes

YOK - Bu refactor geriye uyumlu:
- Eski alanlar hala mevcut (deprecated)
- API response'ları değişmedi
- Frontend değişikliği gerekmiyor

---

## 📅 Sonraki Adımlar

1. Migration script'i staging'de test et
2. Production'da migration çalıştır
3. FAZ6-POST-MIGRATION-CLEANUP.md checklist'ini takip et
4. Deprecated alanları kaldır (opsiyonel, 1-2 sprint sonra)
