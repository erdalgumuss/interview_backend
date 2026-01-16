import { Router } from 'express';
import candidateController from '../controllers/candidate.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateCandidate } from '../../../middlewares/auth';
import { rateLimitMiddleware } from '../../../middlewares/rateLimitMiddleware';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createApplicationSchema } from '../dtos/candidate/createApplication.dto';
import { verifyOtpSchema, resendOtpSchema } from '../dtos/candidate/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/candidate/updateCandidate.dto';

const router = Router();

// ==============================================
// INTERVIEW MANAGEMENT ROUTES
// ==============================================

/**
 * ✅ 1) Mülakat detaylarını getirme
 * GET /api/public/interviews/:interviewId
 */
router.get(
  '/interviews/:interviewId',
  asyncHandler(candidateController.getPublicInterview)
);

/**
 * ✅ 2) Mülakata başvuru oluşturma (Aynı mülakata tekrar başvurmayı engeller!)
 * POST /api/public/interviews/:interviewId/apply
 */
router.post(
  '/interviews/:interviewId/apply',
  rateLimitMiddleware({ windowMs: 10 * 60 * 1000, max: 3 }),
  validateRequest(createApplicationSchema),
  asyncHandler(candidateController.createApplication)
);

// ==============================================
// APPLICATION MANAGEMENT ROUTES
// ==============================================

/**
 * ✅ 3) Session bilgilerini getirme (Resume için)
 * GET /api/public/applications/session
 */
router.get(
  '/applications/session',
  authenticateCandidate,
  asyncHandler(candidateController.getApplicationSession)
);

/**
 * ✅ 4) OTP doğrulama
 * POST /api/public/applications/verify-otp
 */
router.post(
  '/applications/verify-otp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 5 }),
  validateRequest(verifyOtpSchema),
  asyncHandler(candidateController.verifyOtp)
);

/**
 * ✅ 5) OTP tekrar gönderme
 * POST /api/public/applications/resend-otp
 */
router.post(
  '/applications/resend-otp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 3 }),
  validateRequest(resendOtpSchema),
  asyncHandler(candidateController.resendOtp)
);

/**
 * ✅ 6) Aday profil bilgilerini güncelleme
 * PUT /api/public/applications/profile
 * Not: applicationId, authenticateCandidate middleware'den geliyor
 */
router.put(
  '/applications/profile',
  authenticateCandidate,
  validateRequest(updateCandidateSchema),
  asyncHandler(candidateController.updateCandidateDetails)
);

// ==============================================
// FILE UPLOAD ROUTES
// ==============================================

/**
 * ✅ 7) Dosya yükleme URL'i al (CV, Sertifika)
 * GET /api/public/upload-url
 */
router.get(
  '/upload-url',
  authenticateCandidate,
  asyncHandler(candidateController.getUploadUrl)
);

/**
 * ✅ 8) Video yükleme URL'i al
 * GET /api/public/video/upload-url
 */
router.get(
  '/video/upload-url',
  authenticateCandidate,
  asyncHandler(candidateController.getVideoUploadUrl)
);

/**
 * ✅ 9) Video yanıtı kaydet
 * POST /api/public/video/response
 */
router.post(
  '/video/response',
  authenticateCandidate,
  asyncHandler(candidateController.submitVideoResponse)
);




export default router;
