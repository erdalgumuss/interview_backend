import { Router } from 'express';
import personalityTestResponseController from '../controllers/personalityTestResponse.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateCandidate } from '../../../middlewares/auth'; // Aday doğrulama middleware

const router = Router();

// ✅ Adayın kişilik testi yanıtlarını gönderme
router.post(
    '/',
    authenticateCandidate, // Aday token doğrulaması
    asyncHandler(personalityTestResponseController.submitPersonalityTestResponse)
);

// ✅ Adayın kişilik testi sonuçlarını alma
router.get(
    '/',
    authenticateCandidate,
    asyncHandler(personalityTestResponseController.getPersonalityTestResult)
);

export default router;
