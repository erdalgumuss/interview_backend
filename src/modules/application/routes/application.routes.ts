// src/modules/application/routes/application.routes.ts

import { Router } from 'express';
import applicationController from '../controllers/application.controller';
import { authenticate } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

// ===== İK (HR) ENDPOINTS - Authentication Required =====

/**
 * ✅ MEVCUT: Tüm Başvuruları Listeleme ve Filtreleme
 * GET /api/v1/applications/
 * Query params: ?interviewId=...&status=...&minScore=...&maxScore=...&isFavorite=...&page=...&limit=...&sortBy=...&sortOrder=...
 */
router.get(
  '/',
  authenticate,
  asyncHandler(applicationController.getAllApplications)
);

/**
 * ✅ YENİ: Resume Application (Public - Authentication Optional)
 * POST /api/v1/applications/resume
 * Body: { email: string }
 */
router.post(
  '/resume',
  asyncHandler(applicationController.resumeApplication)
);

/**
 * ✅ MEVCUT: Tek başvuru görüntüleme
 * GET /api/v1/applications/:id
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(applicationController.getApplicationById)
);

/**
 * ✅ MEVCUT: Başvuru Durumu Güncelleme
 * PATCH /api/v1/applications/:id/status
 * Body: { status: 'pending' | 'otp_verified' | 'awaiting_video_responses' | 'in_progress' | 'awaiting_ai_analysis' | 'completed' | 'rejected' | 'accepted' }
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(applicationController.updateApplicationStatus)
);

/**
 * ✅ YENİ: İK Notu Ekle
 * POST /api/v1/applications/:id/notes
 * Body: { content: string, isPrivate?: boolean }
 */
router.post(
  '/:id/notes',
  authenticate,
  asyncHandler(applicationController.addHRNote)
);

/**
 * ✅ YENİ: İK Notu Güncelle
 * PATCH /api/v1/applications/:id/notes/:noteId
 * Body: { content?: string, isPrivate?: boolean }
 */
router.patch(
  '/:id/notes/:noteId',
  authenticate,
  asyncHandler(applicationController.updateHRNote)
);

/**
 * ✅ YENİ: İK Notu Sil
 * DELETE /api/v1/applications/:id/notes/:noteId
 */
router.delete(
  '/:id/notes/:noteId',
  authenticate,
  asyncHandler(applicationController.deleteHRNote)
);

/**
 * ✅ YENİ: İK Rating Güncelle
 * PATCH /api/v1/applications/:id/rating
 * Body: { rating: number (1-5) }
 */
router.patch(
  '/:id/rating',
  authenticate,
  asyncHandler(applicationController.updateHRRating)
);

/**
 * ✅ YENİ: Video Upload Status Güncelle
 * PATCH /api/v1/applications/:id/videos/:questionId/status
 * Body: { uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed', uploadError?: string, s3Metadata?: object }
 */
router.patch(
  '/:id/videos/:questionId/status',
  authenticate,
  asyncHandler(applicationController.updateVideoUploadStatus)
);

/**
 * ✅ YENİ: Add to Favorites
 * POST /api/v1/applications/:id/favorite
 */
router.post(
  '/:id/favorite',
  authenticate,
  asyncHandler(applicationController.toggleFavorite)
);

/**
 * ✅ YENİ: Remove from Favorites
 * DELETE /api/v1/applications/:id/favorite
 */
router.delete(
  '/:id/favorite',
  authenticate,
  asyncHandler(applicationController.toggleFavorite)
);

export default router;