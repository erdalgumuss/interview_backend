import { Request, Response, NextFunction } from 'express';
import { AIAnalysisService } from '../services/aiAnalysis.service';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';

class AIAnalysisController {
  private aiAnalysisService: AIAnalysisService;

  constructor() {
    this.aiAnalysisService = new AIAnalysisService();
  }

  /**
   * ✅ Tek bir video için AI analizi yapar.
   * (Video bazlı analiz başlatılır.)
   */
  public analyzeSingleVideo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoResponseId } = req.params;

      if (!videoResponseId) {
        throw new AppError('Video ID is required', ErrorCodes.BAD_REQUEST, 400);
      }

      const result = await this.aiAnalysisService.analyzeSingleVideo(videoResponseId);

      res.status(200).json({
        success: true,
        message: 'Single video analysis completed.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * ✅ Bir başvuru (application) için genel AI analiz hesaplar.
   * (Mülakatın genel sonucu çıkarılır.)
   */
  public calculateGeneralAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { applicationId } = req.params;

      if (!applicationId) {
        throw new AppError('Application ID is required', ErrorCodes.BAD_REQUEST, 400);
      }

      const result = await this.aiAnalysisService.calculateGeneralAIAnalysis(applicationId);

      res.status(200).json({
        success: true,
        message: 'General AI analysis calculated successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export default new AIAnalysisController();
