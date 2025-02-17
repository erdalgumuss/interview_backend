// src/modules/application/routes/candidate.routes.ts

import { Router } from 'express';
import candidateController from '../controllers/candidate.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { authenticateCandidate } from '../../../middlewares/auth';  // ✅ Token doğrulama için
import { rateLimitMiddleware } from '../../../middlewares/rateLimitMiddleware';  // ✅ OTP spam'ı engellemek için
import { validateRequest } from '../../../middlewares/validationMiddleware'; // ✅ Joi DTO validasyonu
import { createApplicationSchema } from '../dtos/createApplication.dto';
import { verifyOtpSchema } from '../dtos/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/updateCandidate.dto';

const router = Router();

/**
 * ✅ Public Interview Route (Kimlik doğrulama gerekmez)
 * GET /api/public/:interviewId
 */
router.get(
  '/:interviewId',
  asyncHandler(candidateController.getPublicInterview)
);

/**
 * ✅ 1) Aday form verilerini gönderip OTP kodu alır (Rate Limitli)
 * POST /api/public
 */
router.post(
  '/',
  rateLimitMiddleware({ windowMs: 10 * 60 * 1000, max: 3 }), // ❌ 10 dk içinde max 3 kez başvurabilir.
  validateRequest(createApplicationSchema), // ✅ Validasyon middleware
  asyncHandler(candidateController.createApplication)
);

/**
 * ✅ 2) OTP doğrulama (Rate Limitli)
 * POST /api/public/verifyOtp
 */
router.post(
  '/verifyOtp',
  rateLimitMiddleware({ windowMs: 5 * 60 * 1000, max: 5 }), // ❌ 5 dk içinde max 5 OTP denemesi yapılabilir.
  validateRequest(verifyOtpSchema),
  asyncHandler(candidateController.verifyOtp)
);

/**
 * ✅ 3) Aday detay bilgilerini güncelleme (Kimlik Doğrulamalı)
 * PUT /api/candidate/update
 */
router.put(
  '/update',
  authenticateCandidate,  // ✅ Token ile yetkilendirme
  validateRequest(updateCandidateSchema),
  asyncHandler(candidateController.updateCandidateDetails)
);

export default router;
