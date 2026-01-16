// src/modules/dashboard/controllers/dashboard.controller.ts

import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';

/**
 * Dashboard Controller - HTTP request handling
 */
class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
    
    // Bind methods to preserve 'this' context
    this.getDashboard = this.getDashboard.bind(this);
    this.toggleFavorite = this.toggleFavorite.bind(this);
    this.getApplicationTrends = this.getApplicationTrends.bind(this);
  }

  /**
   * Ana dashboard verilerini getirir
   * GET /api/dashboard
   */
  public async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return next(
          new AppError('Yetkilendirme gerekli', ErrorCodes.UNAUTHORIZED, 401)
        );
      }

      const dashboardData = await this.dashboardService.getDashboardData(userId);

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Favori toggle işlemi - favorilere ekle/çıkar
   * POST /api/dashboard/favorites/:applicationId
   */
  public async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { applicationId } = req.params;

      if (!userId) {
        return next(
          new AppError('Yetkilendirme gerekli', ErrorCodes.UNAUTHORIZED, 401)
        );
      }

      if (!applicationId) {
        return next(
          new AppError('Başvuru ID\'si gerekli', ErrorCodes.BAD_REQUEST, 400)
        );
      }

      const result = await this.dashboardService.toggleFavoriteApplication(
        userId,
        applicationId
      );

      res.status(200).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Başvuru trendlerini getirir (tarih filtreli - optional)
   * GET /api/dashboard/trends?startDate=2026-01-01&endDate=2026-01-15
   */
  public async getApplicationTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return next(
          new AppError('Yetkilendirme gerekli', ErrorCodes.UNAUTHORIZED, 401)
        );
      }

      // Query parametrelerini al (optional)
      const { startDate, endDate } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      // Tarih parse et (eğer varsa)
      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return next(
            new AppError('Geçersiz başlangıç tarihi', ErrorCodes.BAD_REQUEST, 400)
          );
        }
      }

      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return next(
            new AppError('Geçersiz bitiş tarihi', ErrorCodes.BAD_REQUEST, 400)
          );
        }
      }

      const trendsData = await this.dashboardService.getApplicationTrendsFiltered(
        userId,
        parsedStartDate,
        parsedEndDate
      );

      res.status(200).json({
        success: true,
        data: trendsData
      });
    } catch (error) {
      next(error);
    }
  }
}

// Singleton pattern - tek bir controller instance'ı export et
export default new DashboardController();
