// src/modules/dashboard/routes/dashboard.routes.ts

import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

/**
 * Ana dashboard verilerini getirir
 * @route GET /api/dashboard
 * @access Private (authenticate middleware ile korunuyor)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(dashboardController.getDashboard)
);

/**
 * Favori toggle işlemi - favorilere ekle/çıkar
 * @route POST /api/dashboard/favorites/:applicationId
 * @access Private
 */
router.post(
  '/favorites/:applicationId',
  authenticate,
  asyncHandler(dashboardController.toggleFavorite)
);

/**
 * Başvuru trendlerini getirir (tarih filtreli - optional)
 * @route GET /api/dashboard/trends
 * @query startDate - Başlangıç tarihi (optional)
 * @query endDate - Bitiş tarihi (optional)
 * @access Private
 */
router.get(
  '/trends',
  authenticate,
  asyncHandler(dashboardController.getApplicationTrends)
);

export default router;

