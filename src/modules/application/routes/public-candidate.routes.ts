import { Router } from 'express';
import candidateController from '../controllers/public-candidate.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateCandidate } from '../../../middlewares/auth'; // Candidate token kontrolü
import { rateLimitMiddleware } from '../../../middlewares/rateLimitMiddleware';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createApplicationSchema } from '../dtos/createApplication.dto';
import { verifyOtpSchema, resendOtpSchema } from '../dtos/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/updateCandidate.dto';

const router = Router();

/**
 * ✅ 1) Mülakat detaylarını getirme (Landing)
 * GET /api/public/interview/:interviewId
 */
router.get(
  '/interview/:interviewId',
  asyncHandler(candidateController.getPublicInterview)
);

/**
 * ✅ 2) Aday başvuru oluşturma
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
 * ✅ 4) OTP tekrar gönderme
 * POST /api/public/resendOtp
 */
router.post(
  '/resendOtp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 3 }),
  validateRequest(resendOtpSchema),
  asyncHandler(candidateController.resendOtp)
);

/**
 * ✅ 5) Adayın Mevcut Durumunu Getir (F5 / Refresh Desteği)
 * GET /api/public/me
 */
router.get(
  '/me',
  authenticateCandidate,
  asyncHandler(candidateController.getMyApplication)
);

/**
 * ✅ 6) Aday detay bilgilerini güncelleme (Wizard Form)
 * PUT /api/public/update
 */
router.put(
  '/update',
  authenticateCandidate,
  validateRequest(updateCandidateSchema),
  asyncHandler(candidateController.updateCandidateDetails)
);

/**
 * ✅ 7) Genel Dosya Yükleme URL'i Al (CV, Sertifika)
 * GET /api/public/upload-url
 */
router.get(
  '/upload-url',
  authenticateCandidate,
  asyncHandler(candidateController.getUploadUrl)
);

/**
 * ✅ 8) Video Yükleme URL'i Al (Sınav Soruları İçin)
 * GET /api/public/video/upload-url
 */
router.get(
  '/video/upload-url',
  authenticateCandidate,
  asyncHandler(candidateController.getVideoUploadUrl)
);

/**
 * ✅ 9) Video yanıtı kaydetme (URL ve Status)
 * POST /api/public/video/response
 */
router.post(
  '/video/response',
  authenticateCandidate,
  asyncHandler(candidateController.submitVideoResponse)
);

/**
 * ✅ 10) Kişilik testi yanıtlarını kaydetme
 * POST /api/public/personality-test/response
 */
router.post(
  '/personality-test/response',
  authenticateCandidate,
  asyncHandler(candidateController.submitPersonalityTestResponse)
);

export default router;