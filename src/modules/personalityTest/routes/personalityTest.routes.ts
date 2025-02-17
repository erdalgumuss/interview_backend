import { Router } from 'express';
import personalityTestController from '../controllers/personalityTest.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateAdmin } from '../../../middlewares/auth'; // Admin yetkilendirme

const router = Router();

// Yeni kişilik testi oluştur
router.post('/', authenticateAdmin, asyncHandler(personalityTestController.createPersonalityTest));

// Tüm testleri getir
router.get('/', authenticateAdmin, asyncHandler(personalityTestController.getAllPersonalityTests));

// Belirli bir testi getir
router.get('/:testId', authenticateAdmin, asyncHandler(personalityTestController.getPersonalityTestById));

// Testi güncelle
router.put('/:testId', authenticateAdmin, asyncHandler(personalityTestController.updatePersonalityTest));

// Testi sil
router.delete('/:testId', authenticateAdmin, asyncHandler(personalityTestController.deletePersonalityTest));

export default router;
