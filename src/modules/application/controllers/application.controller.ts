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
   * ✅ GÜNCELLENMIŞ METOT (FAZ 5.3.4): Başvuru Listeleme ve Filtreleme
   * GET /api/v1/applications/
   * Query parametrelerini Service'e iletir.
   * 
   * 📋 FAZ 5.3.4: Response'a analysisStatus, videoStatus, aiStatus alanları eklendi
   */
 public getAllApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const filters = req.query;

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      // 1. Gelen query'den page ve limit değerlerini alıyoruz (Servise de bunlar gidiyor)
      const page = parseInt(filters.page as string) || 1;
      const limit = parseInt(filters.limit as string) || 10;

      const result = await this.applicationService.getAllApplications(filters, userId);

      // FAZ 5.3.4 + FAZ 5.4.3: Response mapping - status alanları ekleme
      const mappedApplications = result.applications.map((app: any) => {
        const appObj = app.toObject ? app.toObject() : app;
        
        // State hesaplamaları
        const responsesCount = appObj.responses?.length || 0;
        const hasAIAnalysis = appObj.generalAIAnalysis?.overallScore != null;
        
        // Video durumu
        const videoStatus = responsesCount > 0 ? 'has_video' : 'no_video';
        
        // AI durumu
        let aiStatus: 'no_analysis' | 'pending' | 'completed' = 'no_analysis';
        if (responsesCount > 0 && !hasAIAnalysis) {
          aiStatus = 'pending';
        } else if (hasAIAnalysis) {
          aiStatus = 'completed';
        }
        
        return {
          ...appObj,
          // FAZ 5.3.4 + FAZ 5.4.3: UI için durum alanları
          videoStatus,
          aiStatus,
          analysisStatus: hasAIAnalysis ? 'completed' : 'pending',
        };
      });

      res.status(200).json({
        success: true,
        data: mappedApplications,
        meta: {
          total: result.total,
          page: page,
          limit: limit,
        }
      });
    } catch (error) {
      next(error);
    }
  };


  /**
   * ✅ GÜNCELLENMIŞ METOT (FAZ 5.4): Tek başvuru görüntüleme (HR Detail View)
   * Sadece mülakat sahibi erişebilir
   * 
   * 📋 FAZ 5.4.1: Zengin detay (video, sorular, AI analiz)
   * 📋 FAZ 5.4.2: AI Analysis Source of Truth düzeni
   * 📋 FAZ 5.4.3: Net state'ler (videoStatus, aiStatus)
   */
  public getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;      // Uygulama ID
      const userId = req.user?.id;    // HR kullanıcının ID'si (JWT'den)

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      const application = await this.applicationService.getApplicationById(id, userId);
      const appObj = (application as any).toObject ? (application as any).toObject() : application;

      // =========================================
      // FAZ 5.4.3: HR İçin Net State'ler
      // =========================================
      const responsesCount = appObj.responses?.length || 0;
      const aiAnalysisCount = appObj.aiAnalysisResults?.length || 0;
      
      // Video durumu
      let videoStatus: 'no_video' | 'has_video' = 'no_video';
      if (responsesCount > 0) {
        videoStatus = 'has_video';
      }
      
      // AI durumu
      let aiStatus: 'no_analysis' | 'pending' | 'completed' = 'no_analysis';
      if (responsesCount > 0 && aiAnalysisCount === 0) {
        aiStatus = 'pending';
      } else if (aiAnalysisCount > 0) {
        aiStatus = 'completed';
      }

      // =========================================
      // FAZ 5.4.2: AI Analysis Source of Truth
      // =========================================
      // latestAIAnalysisId veya aiAnalysisResults[0] kullan
      // generalAIAnalysis sadece fallback
      const primaryAIAnalysis = appObj.latestAIAnalysisId 
        || (appObj.aiAnalysisResults && appObj.aiAnalysisResults[0])
        || null;

      // Overall analysis (aggregate)
      const overallAnalysis = primaryAIAnalysis 
        ? {
            overallScore: primaryAIAnalysis.overallScore || primaryAIAnalysis.evaluationResult?.overallScore,
            communicationScore: primaryAIAnalysis.communicationScore || primaryAIAnalysis.evaluationResult?.communicationScore,
            technicalSkillsScore: primaryAIAnalysis.technicalSkillsScore,
            problemSolvingScore: primaryAIAnalysis.problemSolvingScore,
            personalityMatchScore: primaryAIAnalysis.personalityMatchScore,
            strengths: primaryAIAnalysis.strengths || primaryAIAnalysis.evaluationResult?.strengths,
            improvementAreas: primaryAIAnalysis.improvementAreas,
            recommendation: primaryAIAnalysis.recommendation || primaryAIAnalysis.evaluationResult?.feedback,
            analyzedAt: primaryAIAnalysis.analyzedAt,
            source: 'aiAnalysis' // Source of truth indicator
          }
        : appObj.generalAIAnalysis 
          ? { ...appObj.generalAIAnalysis, source: 'legacy' }
          : null;

      res.status(200).json({
        success: true,
        data: {
          ...appObj,
          // FAZ 5.4.3: Net state'ler
          videoStatus,
          aiStatus,
          analysisStatus: aiStatus === 'completed' ? 'completed' : 'pending',
          // FAZ 5.4.2: Primary AI analysis (source of truth)
          primaryAIAnalysis: overallAnalysis,
        }
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