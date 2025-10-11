// src/modules/application/routes/application.routes.ts

import { Router } from 'express';
import applicationController from '../controllers/application.controller';
import { authenticate } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

// Tüm İK işlemlerinde 'authenticate' zorunludur.

/**
 * ✅ YENİ ROTA: Tüm Başvuruları Listeleme ve Filtreleme
 * GET /api/v1/applications/
 * (Query params: ?interviewId=...&status=...&aiScoreMin=...&page=...&limit=...)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(applicationController.getAllApplications)
);

/**
 * Tek başvuru görüntüleme
 * GET /api/v1/applications/:id
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(applicationController.getApplicationById)
);

/**
 * ✅ YENİ ROTA: Başvuru Durumu Güncelleme
 * PATCH /api/v1/applications/:id/status
 * (Body: { status: 'accepted' | 'rejected' | 'pending' })
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(applicationController.updateApplicationStatus)
);


export default router;