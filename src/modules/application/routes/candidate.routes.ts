// src/modules/interview/routes/interview.public.routes.ts

import { Router } from 'express';
import interviewPublicController from '../controllers/candidate.controller';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import candidateController from '../controllers/candidate.controller';

const router = Router();

/**
 * Public Interview Route
 * Kullanıcı kimliği gerekmeden mülakata ait sınırlı bilgileri döndürür.
 */
router.get(
  '/:interviewId',
  asyncHandler(interviewPublicController.getPublicInterview)
);
/**
 * 1) Aday form verilerini gönderip OTP kodu alır
 *    POST /api/application
 */
router.post(
  '/',
  asyncHandler(candidateController.createApplication)
);

/**
 * 2) OTP doğrulama
 *    POST /api/application/verifyOtp
 */
router.post(
  '/verifyOtp',
  asyncHandler(candidateController.verifyOtp)
);

export default router;
