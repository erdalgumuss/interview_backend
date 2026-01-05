import { Router } from 'express';
import candidateController from '../controllers/candidate.controller';
import { authenticate } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

/**
 * NOT: Tüm bu rotalar İK yetkilileri içindir. 
 * 'authenticate' middleware'i ile JWT doğrulaması yapılır.
 */

// --- 1. ADAY LİSTELEME VE HAVUZ YÖNETİMİ ---

/**
 * @route   GET /api/v1/candidates
 * @desc    Yetenek havuzunu listele ve filtrele
 */
router.get(
    '/', 
    authenticate, 
    asyncHandler(candidateController.listCandidates)
);

/**
 * @route   GET /api/v1/candidates/positions
 * @desc    Adayların başvurduğu pozisyonları listele (filtreleme için)
 */
router.get(
    '/positions', 
    authenticate, 
    asyncHandler(candidateController.getPositions)
);

// --- 2. ADAY DETAY VE ANALİTİK ---

/**
 * @route   GET /api/v1/candidates/:candidateId
 * @desc    Adayın tüm kariyer profilini getir (Eğitim, Deneyim, CV)
 */
router.get(
    '/:candidateId', 
    authenticate, 
    asyncHandler(candidateController.getCandidateDetail)
);

/**
 * @route   GET /api/v1/candidates/:candidateId/interviews
 * @desc    Adayın tüm mülakat geçmişini listele
 */
router.get(
    '/:candidateId/interviews', 
    authenticate, 
    asyncHandler(candidateController.getCandidateInterviews)
);

/**
 * @route   GET /api/v1/candidates/:candidateId/score-trend
 * @desc    Adayın mülakatlardaki başarı grafiğini getir
 */
router.get(
    '/:candidateId/score-trend', 
    authenticate, 
    asyncHandler(candidateController.getScoreTrend)
);

// --- 3. İK ETKİLEŞİMLERİ (Notlar, Favoriler, Durum) ---

/**
 * @route   POST /api/v1/candidates/:candidateId/notes
 * @desc    Aday profiline özel İK notu ekle
 */
router.post(
    '/:candidateId/notes', 
    authenticate, 
    asyncHandler(candidateController.addNote)
);

/**
 * @route   PATCH /api/v1/candidates/:candidateId/status
 * @desc    Adayın havuzdaki durumunu güncelle (shortlisted, rejected vb.)
 */
router.patch(
    '/:candidateId/status', 
    authenticate, 
    asyncHandler(candidateController.updateStatus)
);

/**
 * @route   POST /api/v1/candidates/:candidateId/favorite
 * @desc    Adayı favorilere ekle/çıkar
 */
router.post(
    '/:candidateId/favorite', 
    authenticate, 
    asyncHandler(candidateController.addToFavorites)
);

// --- 4. VERİ BÜTÜNLÜĞÜ (Merge & Duplicates) ---

/**
 * @route   GET /api/v1/candidates/:candidateId/potential-duplicates
 * @desc    Olası mükerrer kayıtları (aynı isim/tel) listele
 */
router.get(
    '/:candidateId/potential-duplicates', 
    authenticate, 
    asyncHandler(candidateController.getPotentialDuplicates)
);

/**
 * @route   POST /api/v1/candidates/:candidateId/merge
 * @desc    İki farklı aday profilini birleştir
 */
router.post(
    '/:candidateId/merge', 
    authenticate, 
    asyncHandler(candidateController.mergeCandidates)
);

export default router;