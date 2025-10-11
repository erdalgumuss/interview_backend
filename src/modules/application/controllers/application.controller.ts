// src/modules/application/controllers/application.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { updateApplicationStatusSchema, UpdateApplicationStatusDTO } from '../dtos/updateApplicationStatus.dto'; // ✅ Yeni ekleme

class ApplicationController {
  private applicationService: ApplicationService;

  constructor() {
    this.applicationService = new ApplicationService();
    // ✅ Metotların `this` bağlamını korumak için bind ediyoruz
    this.getApplicationById = this.getApplicationById.bind(this);
    this.getAllApplications = this.getAllApplications.bind(this); // ✅ Yeni metot
    this.updateApplicationStatus = this.updateApplicationStatus.bind(this); // ✅ Yeni metot
  }

  /**
   * ✅ YENİ METOT: Başvuru Listeleme ve Filtreleme
   * GET /api/v1/applications/
   * Query parametrelerini Service'e iletir.
   */
  public getAllApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id; // HR kullanıcının ID'si (JWT'den)
      const filters = req.query;   // Tüm filtreler (interviewId, status, page, limit vb.)

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      // Servis, filtreleri, sayfalandırmayı ve yetkiyi işleyecek
      const result = await this.applicationService.getAllApplications(filters, userId);

      res.status(200).json({
        success: true,
        data: result.applications,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        }
      });
    } catch (error) {
      next(error);
    }
  };


  /**
   * Tek başvuru görüntüleme
   * Sadece mülakat sahibi erişebilir
   */
  public getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;      // Uygulama ID
      const userId = req.user?.id;    // HR kullanıcının ID'si (JWT'den)

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      const application = await this.applicationService.getApplicationById(id, userId);

      res.status(200).json({
        success: true,
        data: application
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * ✅ YENİ METOT: Başvuru Durumu Güncelleme
   * PATCH /api/v1/applications/:id/status
   */
  public updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;      // Uygulama ID
      const userId = req.user?.id;    // HR kullanıcının ID'si (JWT'den)
      const updateData = req.body;

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      // 1) DTO Validasyonu
      const { error } = updateApplicationStatusSchema.validate(updateData);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }
      const { status } = updateData as UpdateApplicationStatusDTO;

      // 2) Service'e ilet
      const updatedApplication = await this.applicationService.updateApplicationStatus(id, status, userId);

      res.status(200).json({
        success: true,
        data: updatedApplication,
        message: 'Başvuru durumu başarıyla güncellendi.',
      });
    } catch (error) {
      next(error);
    }
  };

}

export default new ApplicationController();