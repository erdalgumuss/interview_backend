
import { CandidateRepository } from '../repositories/candidate.repository';
import { InterviewRepository } from '../../interview/repositories/interview.repository';
import { ApplicationRepository } from '../repositories/application.repository';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { IInterview, InterviewStatus } from '../../interview/models/interview.model';
import { IApplication } from '../models/application.model'; // Dikkat, path proje yapınıza göre değişebilir
import { CreateApplicationDTO } from '../dtos/createApplication.dto';
import { VerifyOtpDTO, VerifyOtpResponseDTO } from '../dtos/otpVerify.dto';
import { generateRandomCode } from '../../../utils/stringUtils';
import { Types } from 'mongoose';
import { GetPublicInterviewDTO } from '../dtos/publicInterview.dto';
import { generateCandidateToken } from '../../../utils/tokenUtils';
import { UpdateCandidateDTO } from '../dtos/updateCandidate.dto';

export class CandidateService {
  private interviewRepository: InterviewRepository;
  private applicationRepository: ApplicationRepository;
  private candidateRepository: CandidateRepository;
  constructor() {
    this.interviewRepository = new InterviewRepository();
    this.applicationRepository = new ApplicationRepository();
    this.candidateRepository = new CandidateRepository();
  }

  public async getPublicInterview(interviewId: string): Promise<GetPublicInterviewDTO> {
    const interview = await this.candidateRepository.getInterviewPublicById(interviewId);
    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }
  
    if (
      interview.status !== InterviewStatus.PUBLISHED &&
      interview.status !== InterviewStatus.ACTIVE
    ) {
      throw new AppError('This interview is not accessible.', ErrorCodes.FORBIDDEN, 403);
    }
  
    if (interview.expirationDate && interview.expirationDate.getTime() < Date.now()) {
      throw new AppError('This interview is expired.', ErrorCodes.FORBIDDEN, 403);
    }
  
    return {
      interviewId: (interview._id as Types.ObjectId).toString(),
      title: interview.title,
      createdAt: interview.createdAt ?? new Date(),
      expirationDate: interview.expirationDate,
      status: interview.status,
      personalityTestId: interview.personalityTestId?.toString(),
      stages: interview.stages,
      questions: interview.questions.map(q => ({
        questionText: q.questionText,
        order: q.order,
        duration: q.duration
      })),
    };
  }
  

  /**
   * Aday form verilerini gönderir -> Uygulama kaydı oluşturulur -> OTP kodu oluşturup SMS gönderilir.
   */
  public async createApplication(data: CreateApplicationDTO): Promise<IApplication> {
    const interview = await this.interviewRepository.getInterviewById(data.interviewId);
    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (
      interview.status !== InterviewStatus.PUBLISHED &&
      interview.status !== InterviewStatus.ACTIVE
    ) {
      throw new AppError('Interview is not accessible', ErrorCodes.FORBIDDEN, 403);
    }

    const otpCode = generateRandomCode(6);

    const applicationData: Partial<IApplication> = {
      interviewId: interview._id as Types.ObjectId,
      candidate: {
        name: data.name,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        phoneVerified: false,
        verificationCode: otpCode,
        kvkkConsent: data.kvkkConsent,
      },
      status: 'pending',
    };

    const createdApp = await this.applicationRepository.createApplication(applicationData);

    console.log(`SMS sent to ${data.phone} with code ${otpCode}`);

    return createdApp;
  }

  /**
   * OTP kodu doğrulama -> phoneVerified = true
   */
  public async verifyOtp(data: VerifyOtpDTO): Promise<VerifyOtpResponseDTO>{
    const { applicationId, otpCode } = data;

    const application = await this.candidateRepository.getApplicationByIdWithVerification(applicationId);
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // OTP expire kontrolü (opsiyonel)
    // if (application.candidate.verificationExpiresAt && application.candidate.verificationExpiresAt < new Date()) {
    //   throw new AppError('OTP code expired', ErrorCodes.UNAUTHORIZED, 401);
    // }

    if (application.candidate.verificationCode !== otpCode) {
      throw new AppError('Invalid OTP code', ErrorCodes.UNAUTHORIZED, 401);
    }

    application.candidate.phoneVerified = true;
    application.candidate.verificationCode = undefined;

    const updatedApp = await this.applicationRepository.updateApplicationById(applicationId, application);

    if (!updatedApp) {
      throw new AppError('Could not update application', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }
    const token = generateCandidateToken(applicationId);

    return { token, application: updatedApp };
  }

  /**
   * Aday detay bilgilerini güncelleme işlemi.
   */
  public async updateCandidateDetails(data: UpdateCandidateDTO) {
    const { applicationId, education, experience, skills } = data;
  
    const application = await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }
  
    // ✅ Varsayılan değerleri atayarak undefined hatasını önlüyoruz
    application.candidate.education = education ?? application.candidate.education;
    application.candidate.experience = experience?.map(exp => ({
      company: exp.company,
      position: exp.position,
      duration: exp.duration,
      responsibilities: exp.responsibilities ?? "", // ✅ Varsayılan değer atandı
    })) ?? application.candidate.experience;
  
    application.candidate.skills = {
      technical: skills?.technical ?? application.candidate.skills?.technical ?? [],
      personal: skills?.personal ?? application.candidate.skills?.personal ?? [],
      languages: skills?.languages ?? application.candidate.skills?.languages ?? [],
    };
  
    application.status = 'in_progress';
  
    const updatedApplication = await this.candidateRepository.updateCandidate(applicationId, application);
  
    return updatedApplication;
  }
  
}
