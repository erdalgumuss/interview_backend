import { Router } from 'express';
import applicationController from '../controllers/application.controller';
import { authenticate } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

/**
 * Tek başvuru görüntüleme (Sadece mülakatı oluşturan kullanıcı)
 */
router.get(
  '/:id',
  authenticate,  // Kullanıcı girişi doğrulaması (JWT)
  asyncHandler(applicationController.getApplicationById)
);

export default router;
