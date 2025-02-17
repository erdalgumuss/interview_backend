
import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/candidate.service';
import { getPublicInterviewSchema } from '../dtos/publicInterview.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { CreateApplicationDTO, createApplicationSchema } from '../dtos/createApplication.dto';
import { VerifyOtpDTO, verifyOtpSchema } from '../dtos/otpVerify.dto';
import { updateCandidateSchema } from '../dtos/updateCandidate.dto';

class CandidateController {
  private candidateService: CandidateService;

  constructor() {
      this.candidateService = new CandidateService();
  
      // `this` bağlamını kaybetmemek için bind ediyoruz
      this.getPublicInterview = this.getPublicInterview.bind(this);
      this.createApplication = this.createApplication.bind(this);
      this.verifyOtp = this.verifyOtp.bind(this);
      this.updateCandidateDetails = this.updateCandidateDetails.bind(this);
     }

  public getPublicInterview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { interviewId } = req.params;

      // DTO Validasyon (Opsiyonel)
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
   * Aday form verilerini gönderip OTP kodu oluşturma ve SMS gönderme
   */
  public createApplication = async (req: Request, res: Response, next: NextFunction) => {
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
   * OTP doğrulama
   */
/**
 * OTP doğrulama
 */
public verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Validasyon
    const { error } = verifyOtpSchema.validate(req.body);
    if (error) {
      throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
    }
    const dto = req.body as VerifyOtpDTO;

    // 2) Service çağır
    const response = await this.candidateService.verifyOtp(dto);

    // ✅ response.application üzerinden verilere erişiyoruz
    res.status(200).json({
      success: true,
      data: {
        applicationId: response.application._id,  // ✅ Burada response.application._id kullanılmalı
        status: response.application.status,
        phoneVerified: response.application.candidate.phoneVerified,
        token: response.token,  // ✅ Yeni eklenen token da frontend'e gönderilir
      },
    });
  } catch (err) {
    next(err);
  }
};

  /**
   * Aday kişisel bilgilerini günceller.
   */
  public async updateCandidateDetails(req: Request, res: Response, next: NextFunction) {
    try {
      // Gelen veriyi validasyon şeması ile doğrula
      const { error } = updateCandidateSchema.validate(req.body);
      if (error) {
        throw new Error(error.message);
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
}
const candidateController = new CandidateController();
export default candidateController;