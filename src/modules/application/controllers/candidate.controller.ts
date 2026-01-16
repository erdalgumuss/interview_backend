import { Request, Response, NextFunction } from "express";
import { CandidateService } from "../services/candidate.service";
import { getPublicInterviewSchema } from "../dtos/candidate/publicInterview.dto";
import { AppError } from "../../../middlewares/errors/appError";
import { ErrorCodes } from "../../../constants/errors";
import {
  CreateApplicationDTO,
  createApplicationSchema,
} from "../dtos/candidate/createApplication.dto";
import { VerifyOtpDTO, verifyOtpSchema } from "../dtos/candidate/otpVerify.dto";
import { updateCandidateSchema } from "../dtos/candidate/updateCandidate.dto";
import { resendOtpSchema } from "../dtos/candidate/otpVerify.dto"; // ✅ Yeni ekleme
import {
  videoResponseSchema,
  VideoResponseDTO,
} from "../dtos/candidate/videoResponse.dto"; // ✅ Video DTO eklendi
import {
  personalityTestSchema,
  PersonalityTestResponseDTO,
} from "../dtos/candidate/personalityTest.dto"; // ✅ Test DTO eklendi

class CandidateController {
  private candidateService: CandidateService;

  constructor() {
    this.candidateService = new CandidateService();

    // ... mevcut bind işlemleri ...
    this.getPublicInterview = this.getPublicInterview.bind(this);
    this.createApplication = this.createApplication.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
    this.updateCandidateDetails = this.updateCandidateDetails.bind(this);
    this.getApplicationSession = this.getApplicationSession.bind(this);
    this.resendOtp = this.resendOtp.bind(this);
  }

  public getPublicInterview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { interviewId } = req.params;

      // DTO Validasyon (Opsiyonel)
      const { error } = getPublicInterviewSchema.validate({ interviewId });
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const interview =
        await this.candidateService.getPublicInterview(interviewId);

      res.status(200).json({
        success: true,
        data: interview,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Aday form verilerini gönderip OTP kodu oluşturma ve SMS gönderme
   */
  public createApplication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // 1) Validasyon
      const { error } = createApplicationSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }
      const dto = req.body as CreateApplicationDTO;

      // 2) Service çağır
      const application = await this.candidateService.createApplication(dto);

      res.status(201).json({
        success: true,
        data: {
          applicationId: application._id,
          status: application.status,
          phoneVerified: application.candidate.phoneVerified,
          // OTP kodu 'gizli', istersen hiç dönmezsin
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Aday session bilgilerini getirme (Resume için)
   * Bu endpoint authenticate edilmiş kullanıcılar için
   */
  public getApplicationSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // authenticateCandidate middleware'den gelen user bilgisi
      const applicationId = req.user?.applicationId;

      if (!applicationId) {
        throw new AppError(
          "Session not found. Please start over.",
          ErrorCodes.UNAUTHORIZED,
          401
        );
      }

      const sessionData =
        await this.candidateService.getApplicationSession(applicationId);

      res.status(200).json({
        success: true,
        data: sessionData,
      });
    } catch (err) {
      next(err);
    }
  };

  public getService(): CandidateService {
    return this.candidateService; // ✅ Getter fonksiyon ile erişim sağlanıyor
  }
  /**
   * OTP doğrulama
   */
  /**
   * OTP doğrulama
   */
  public verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // 1) Validasyon
      const { error } = verifyOtpSchema.validate(req.body);
      if (error) {
        throw new AppError(
          "The OTP code is incorrect. Please try again.",
          ErrorCodes.UNAUTHORIZED,
          401
        );
      }
      const dto = req.body as VerifyOtpDTO;

      // 2) Service çağır
      const response = await this.candidateService.verifyOtp(dto);

      // ✅ Frontend'in ihtiyacı olan tüm verileri dön
      res.status(200).json({
        success: true,
        data: {
          token: response.token,
          application: {
            _id: response.application._id,
            status: response.application.status,
            education: response.application.education || [],
            experience: response.application.experience || [],
            documents: response.application.documents || {},
            responses: response.application.responses || [],
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };
  public async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      // ✅ Validasyon
      const { error } = resendOtpSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const { applicationId } = req.body;
      await this.candidateService.resendOtp(applicationId);

      res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your phone.",
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * Aday kişisel bilgilerini günceller.
   */
  public async updateCandidateDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Middleware'den gelen applicationId
      const applicationId = req.user?.applicationId;

      if (!applicationId) {
        throw new AppError("Unauthorized", ErrorCodes.UNAUTHORIZED, 401);
      }

      // applicationId'yi body'e ekle (service bunu bekliyor)
      const dataWithApplicationId = {
        ...req.body,
        applicationId,
      };

      // Not: Body validasyonu route middleware tarafından yapılıyor
      // applicationId middleware'den ekleniyor, DTO'da zorunlu değil

      const updatedApplication =
        await this.candidateService.updateCandidateDetails(
          dataWithApplicationId
        );

      res.status(200).json({
        success: true,
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ Dosya Yükleme URL'i Al (CV, Sertifika vb.)
   * GET /api/public/upload-url?fileType=...&fileName=...
   */
  public getUploadUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const applicationId = req.user?.applicationId;
      const { fileType, fileName } = req.query;

      if (!applicationId) {
        throw new AppError("Unauthorized", ErrorCodes.UNAUTHORIZED, 401);
      }
      if (!fileType || !fileName) {
        throw new AppError("Missing file info", ErrorCodes.BAD_REQUEST, 400);
      }

      const result = await this.candidateService.getUploadUrl(
        applicationId,
        String(fileType),
        String(fileName)
      );

      res.status(200).json({
        success: true,
        data: result, // { uploadUrl, fileKey }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * ✅ Video Yükleme URL'i Al
   * GET /api/public/video/upload-url?questionId=...&contentType=...
   */
  public getVideoUploadUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const applicationId = req.user?.applicationId;
      const { questionId, contentType } = req.query;

      if (!applicationId) {
        throw new AppError("Unauthorized access", ErrorCodes.UNAUTHORIZED, 401);
      }
      if (!questionId) {
        throw new AppError(
          "Question ID is required",
          ErrorCodes.BAD_REQUEST,
          400
        );
      }

      const result = await this.candidateService.getVideoUploadUrl(
        applicationId,
        String(questionId),
        String(contentType) || "video/webm"
      );

      res.status(200).json({
        success: true,
        data: result, // { uploadUrl, videoKey }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * ✅ Video Yanıtı Kaydet
   * POST /api/public/video/response
   */
  public submitVideoResponse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const applicationId = req.user?.applicationId;

      if (!applicationId) {
        throw new AppError("Unauthorized", ErrorCodes.UNAUTHORIZED, 401);
      }

      // Body validation
      const { error } = videoResponseSchema.validate(req.body);
      if (error) {
        throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
      }

      const { questionId, videoUrl, duration } = req.body;

      // QuestionId format kontrolü
      if (!questionId || questionId.length !== 24) {
        throw new AppError(
          "Invalid questionId format",
          ErrorCodes.BAD_REQUEST,
          400
        );
      }

      const updatedApplication = await this.candidateService.saveVideoResponse(
        applicationId,
        { questionId, videoUrl, duration }
      );

      res.status(200).json({
        success: true,
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  };
}
const candidateController = new CandidateController();
export default candidateController;
