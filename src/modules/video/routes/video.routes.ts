import { Router } from 'express';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { candidateAuth } from '../../../middlewares/candidateAuth.middleware';
import videoResponseController from '../controllers/videoResponse.controller';

const router = Router();

/**
 * ✅ Adayın video yükleme rotası
 * POST /api/video/upload
 */
router.post('/upload', candidateAuth, asyncHandler(videoResponseController.uploadVideoResponse));

/**
 * ✅ Adayın tüm video yanıtlarını alması
 * GET /api/video
 */
router.get('/', candidateAuth, asyncHandler(videoResponseController.getVideoResponses));

export default router;
