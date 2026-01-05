import { Router } from 'express';
import candidateController from '../controllers/public-candidate.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateCandidate } from '../../../middlewares/auth';
import { rateLimitMiddleware } from '../../../middlewares/rateLimitMiddleware';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createApplicationSchema } from '../dtos/createApplication.dto';
import { verifyOtpSchema, resendOtpSchema } from '../dtos/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/updateCandidate.dto';

const router = Router();

/**
 * ✅ 1) Mülakat detaylarını getirme
 * GET /api/public/interview/:interviewId
 */
router.get(
  '/interview/:interviewId',
  asyncHandler(candidateController.getPublicInterview)
);

/**
 * ✅ 2) Aday başvuru oluşturma (Aynı mülakata tekrar başvurmayı engeller!)
 * POST /api/public
 */
router.post(
  '/',
  rateLimitMiddleware({ windowMs: 10 * 60 * 1000, max: 3 }),
  validateRequest(createApplicationSchema),
  asyncHandler(candidateController.createApplication)
);

/**
 * ✅ 3) OTP doğrulama
 * POST /api/public/verifyOtp
 */
router.post(
  '/verifyOtp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 5 }),
  validateRequest(verifyOtpSchema),
  asyncHandler(candidateController.verifyOtp)
);

/**
 * ✅ 4) OTP tekrar gönderme (Yeni API eklendi)
 * POST /api/public/resendOtp
 */
router.post(
  '/resendOtp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 3 }),
  validateRequest(resendOtpSchema),
  asyncHandler(candidateController.resendOtp)
);

/**
 * ✅ 5) Aday detay bilgilerini güncelleme
 * PUT /api/public/update
 */
router.put(
  '/update',
  authenticateCandidate,
  validateRequest(updateCandidateSchema),
  asyncHandler(candidateController.updateCandidateDetails)
);
// 6. Video yanıtı kaydetme (URL)
router.post('/video/response', authenticateCandidate, candidateController.submitVideoResponse);

// 7. Kişilik testi yanıtlarını kaydetme
router.post('/personality-test/response', authenticateCandidate, candidateController.submitPersonalityTestResponse);

export default router;
