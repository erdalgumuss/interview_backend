// src/modules/application/controllers/public-candidate.controller.ts

import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/public-candidate.service';
import { VideoResponseService } from '../../video/services/videoResponse.service'; // ✅ Video Servisi Eklendi

import { getPublicInterviewSchema } from '../dtos/publicInterview.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { CreateApplicationDTO, createApplicationSchema } from '../dtos/createApplication.dto';
import { VerifyOtpDTO, verifyOtpSchema, resendOtpSchema } from '../dtos/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/updateCandidate.dto';
import { videoResponseSchema, VideoResponseDTO } from '../dtos/videoResponse.dto';
import { personalityTestSchema, PersonalityTestResponseDTO } from '../dtos/personalityTest.dto';

class PublicCandidateController { // ✅ İsim güncellendi
  private candidateService: CandidateService;
  private videoResponseService: VideoResponseService; // ✅ Servis tanımı

  constructor() {
    this.candidateService = new CandidateService();
    this.videoResponseService = new VideoResponseService(); // ✅ Servis başlatma

    // Bind işlemleri
    this.getPublicInterview = this.getPublicInterview.bind(this);
    this.createApplication = this.createApplication.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
    this.resendOtp = this.resendOtp.bind(this);
    this.updateCandidateDetails = this.updateCandidateDetails.bind(this);
    this.getVideoUploadUrl = this.getVideoUploadUrl.bind(this); // ✅ Yeni metod bind edildi
    this.submitVideoResponse = this.submitVideoResponse.bind(this);
    this.submitPersonalityTestResponse = this.submitPersonalityTestResponse.bind(this);

    this.getMyApplication = this.getMyApplication.bind(this);
    this.getUploadUrl = this.getUploadUrl.bind(this);
  }

  /**
   * 1. Adım: Mülakat Bilgilerini Getir (Landing Page)
   * Auth Gerekmez
   */
  public getPublicInterview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { interviewId } = req.params;

      const { error } = getPublicInterviewSchema.validate({ interviewId });
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const interview = await this.candidateService.getPublicInterview(interviewId);

      res.status(200).json({
        success: true,
        data: interview,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * 2. Adım: Başvuru Başlat (Ad/Soyad/Tel -> OTP Gönder)
   * Auth Gerekmez
   */
  public createApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = createApplicationSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }
      const dto = req.body as CreateApplicationDTO;

      const application = await this.candidateService.createApplication(dto);

      res.status(201).json({
        success: true,
        data: {
          applicationId: application._id,
          status: application.status,
          phoneVerified: application.candidate.phoneVerified,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * 3. Adım: OTP Doğrulama -> JWT Token Al
   */
  public verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyOtpSchema.validate(req.body);
      if (error) {
        throw new AppError('The OTP code is incorrect.', ErrorCodes.UNAUTHORIZED, 401);
      }
      const dto = req.body as VerifyOtpDTO;

      const response = await this.candidateService.verifyOtp(dto);

      res.status(200).json({
        success: true,
        data: {
          applicationId: response.application._id,
          status: response.application.status,
          phoneVerified: response.application.candidate.phoneVerified,
          token: response.token, // Frontend bu token'ı saklamalı
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = resendOtpSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const { applicationId } = req.body;
      await this.candidateService.resendOtp(applicationId);

      res.status(200).json({
        success: true,
        message: 'A new OTP has been sent to your phone.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 4. Adım: Kişisel Detayları Güncelle
   * Auth Gerekir (candidateAuth)
   */
  public async updateCandidateDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = updateCandidateSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const updatedApplication = await this.candidateService.updateCandidateDetails(req.body);

      res.status(200).json({
        success: true,
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ YENİ METOT: Video Yükleme Linki (Presigned URL) Al
   * GET /api/v1/public/upload-url?questionId=...&contentType=video/webm
   * Auth Gerekir (candidateAuth)
   */
  public getVideoUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const applicationId = req.user?.id; // Token'dan gelir
        const { questionId, contentType } = req.query;

        if (!applicationId) {
            throw new AppError('Unauthorized access', ErrorCodes.UNAUTHORIZED, 401);
        }

        if (!questionId) {
            throw new AppError('Question ID is required', ErrorCodes.BAD_REQUEST, 400);
        }

        // Service çağrısı
        const result = await this.videoResponseService.getUploadUrl(
            applicationId,
            questionId as string,
            (contentType as string) || 'video/webm'
        );

        res.status(200).json({
            success: true,
            data: result // { uploadUrl: "...", videoKey: "..." }
        });
    } catch (err) {
        next(err);
    }
  };

  /**
   * 5. Adım: Video Yüklendikten Sonra Kaydı Tamamla
   * Auth Gerekir (candidateAuth)
   */
  public submitVideoResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await videoResponseSchema.validateAsync(req.body);
      const applicationId = req.user?.id;

      if (!applicationId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      const updatedApplication = await this.candidateService.saveVideoResponse(
        validatedData as VideoResponseDTO,
        applicationId
      );

      res.status(200).json({
        success: true,
        message: 'Video response saved successfully.',
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * 6. Adım: Kişilik Testi Cevaplarını Gönder
   * Auth Gerekir (candidateAuth)
   */
  public submitPersonalityTestResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await personalityTestSchema.validateAsync(req.body);
      const applicationId = req.user?.id;

      if (!applicationId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      const updatedApplication = await this.candidateService.savePersonalityTestResponse(
        validatedData as PersonalityTestResponseDTO,
        applicationId
      );

      res.status(200).json({
        success: true,
        message: 'Personality test responses saved.',
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  };
  /**
   * ✅ YENİ METOT: Adayın Mevcut Durumunu Getir (F5 desteği)
   * GET /api/public/me
   */
  public getMyApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Middleware'den (candidateAuth) gelen user id = applicationId
      const applicationId = req.user?.id; 

      if (!applicationId) {
        throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      }

      // Servis'te bu metodu az önce eklemiştik
      const application = await this.candidateService.getMyApplication(applicationId);

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * ✅ YENİ METOT: Genel Dosya Yükleme (CV, Sertifika vb.)
   * GET /api/public/upload-url?fileType=...&fileName=...
   */
  public getUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.user?.id;
      const { fileType, fileName } = req.query;

      if (!applicationId) throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
      if (!fileType || !fileName) throw new AppError('Missing file info', ErrorCodes.BAD_REQUEST, 400);

      // Servis'te bu metodu az önce eklemiştik
      const result = await this.candidateService.getUploadUrl(
        applicationId, 
        String(fileType), 
        String(fileName)
      );

      res.status(200).json({
        success: true,
        data: result // { uploadUrl, fileKey }
      });
    } catch (err) {
      next(err);
    }
  };
}

const publicCandidateController = new PublicCandidateController();
export default publicCandidateController;