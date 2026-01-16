// src/modules/application/controllers/application.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { updateApplicationStatusSchema, UpdateApplicationStatusDTO } from '../dtos/hr/updateApplicationStatus.dto'; // ✅ Yeni ekleme

class ApplicationController {
  private applicationService: ApplicationService;

  constructor() {
    this.applicationService = new ApplicationService();
    // ✅ Metotların `this` bağlamını korumak için bind ediyoruz
    this.getApplicationById = this.getApplicationById.bind(this);
    this.getAllApplications = this.getAllApplications.bind(this);
    this.updateApplicationStatus = this.updateApplicationStatus.bind(this);
    this.addHRNote = this.addHRNote.bind(this);
    this.updateHRNote = this.updateHRNote.bind(this);
    this.deleteHRNote = this.deleteHRNote.bind(this);
    this.updateHRRating = this.updateHRRating.bind(this);
    this.updateVideoUploadStatus = this.updateVideoUploadStatus.bind(this);
    this.resumeApplication = this.resumeApplication.bind(this);
    this.toggleFavorite = this.toggleFavorite.bind(this);
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

  /**
   * ✅ YENİ: İK Notu Ekle
   * POST /api/v1/applications/:id/notes
   */
  public addHRNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      // Type assertion - User modelinde name field'ı olabilir
      const userName = (req as any).user?.name || (req as any).user?.email || 'HR User';
      const { content, isPrivate = false } = req.body;

      if (!userId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      if (!content || content.length < 10) {
        throw new AppError('Not içeriği en az 10 karakter olmalıdır', ErrorCodes.BAD_REQUEST, 400);
      }

      const application = await this.applicationService.addHRNote(
        id,
        userId,
        userName,
        content,
        isPrivate
      );

      res.status(201).json({
        success: true,
        data: application,
        message: 'İK notu başarıyla eklendi.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: İK Notu Güncelle
   * PATCH /api/v1/applications/:id/notes/:noteId
   */
  public updateHRNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, noteId } = req.params;
      const userId = req.user?.id;
      const { content, isPrivate } = req.body;

      if (!userId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (isPrivate !== undefined) updates.isPrivate = isPrivate;

      const application = await this.applicationService.updateHRNote(
        id,
        noteId,
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        data: application,
        message: 'İK notu başarıyla güncellendi.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: İK Notu Sil
   * DELETE /api/v1/applications/:id/notes/:noteId
   */
  public deleteHRNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, noteId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      const application = await this.applicationService.deleteHRNote(
        id,
        noteId,
        userId
      );

      res.status(200).json({
        success: true,
        data: application,
        message: 'İK notu başarıyla silindi.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: İK Rating Güncelle
   * PATCH /api/v1/applications/:id/rating
   */
  public updateHRRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { rating } = req.body;

      if (!userId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new AppError('Rating 1-5 arasında olmalıdır', ErrorCodes.BAD_REQUEST, 400);
      }

      const application = await this.applicationService.updateHRRating(
        id,
        rating,
        userId
      );

      res.status(200).json({
        success: true,
        data: application,
        message: 'Rating başarıyla güncellendi.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: Video Upload Status Güncelle
   * PATCH /api/v1/applications/:id/videos/:questionId/status
   */
  public updateVideoUploadStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, questionId } = req.params;
      const { uploadStatus, uploadError, s3Metadata } = req.body;

      if (!uploadStatus) {
        throw new AppError('Upload status zorunludur', ErrorCodes.BAD_REQUEST, 400);
      }

      const application = await this.applicationService.updateVideoUploadStatus(
        id,
        questionId,
        uploadStatus,
        uploadError,
        s3Metadata
      );

      res.status(200).json({
        success: true,
        data: application,
        message: 'Video upload durumu güncellendi.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: Resume Application
   * POST /api/v1/applications/resume
   */
  public resumeApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email zorunludur', ErrorCodes.BAD_REQUEST, 400);
      }

      const application = await this.applicationService.resumeApplication(email);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Devam edilebilir başvuru bulunamadı.',
        });
      }

      res.status(200).json({
        success: true,
        data: application,
        message: 'Başvuruya devam edebilirsiniz.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ YENİ: Toggle Favorite (Add/Remove)
   * POST /api/v1/applications/:id/favorite
   * DELETE /api/v1/applications/:id/favorite
   */
  public toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const action = req.method === 'POST' ? 'add' : 'remove';

      if (!userId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      const application = await this.applicationService.toggleFavorite(id, userId, action);

      res.status(200).json({
        success: true,
        data: application,
        message: action === 'add' ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ApplicationController();