import { CandidateRepository } from "../repositories/candidate.repository";
import { InterviewRepository } from "../../interview/repositories/interview.repository";
import { ApplicationRepository } from "../repositories/application.repository";
import { ApplicationService } from "./application.service"; // ✅ ApplicationService import
import { AppError } from "../../../middlewares/errors/appError";
import { ErrorCodes } from "../../../constants/errors";
import {
  IInterview,
  InterviewStatus,
} from "../../interview/models/interview.model";
import {
  IApplication,
  IApplicationResponse,
} from "../models/application.model"; // Dikkat, path proje yapınıza göre değişebilir
import { CreateApplicationDTO } from "../dtos/candidate/createApplication.dto";
import {
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
} from "../dtos/candidate/otpVerify.dto";
import { generateRandomCode } from "../../../utils/stringUtils";
import { Types } from "mongoose";
import { GetPublicInterviewDTO } from "../dtos/candidate/publicInterview.dto";
import { UpdateCandidateDTO } from "../dtos/candidate/updateCandidate.dto";
import { generateCandidateToken } from "../../../utils/tokenUtils";
import { VideoResponseDTO } from "../dtos/candidate/videoResponse.dto"; // ✅ Yeni DTO
import { PersonalityTestResponseDTO } from "../dtos/candidate/personalityTest.dto"; // ✅ Yeni DTO
import { s3Service } from "../../../services/s3.service"; // ✅ S3 Service

export class CandidateService {
  private interviewRepository: InterviewRepository;
  private applicationRepository: ApplicationRepository;
  private candidateRepository: CandidateRepository;
  private applicationService: ApplicationService; // ✅ ApplicationService

  constructor() {
    this.interviewRepository = new InterviewRepository();
    this.applicationRepository = new ApplicationRepository();
    this.candidateRepository = new CandidateRepository();
    this.applicationService = new ApplicationService(); // ✅ Initialize
  }

  /**
   * ✅ ApplicationService'e erişim için getter
   */
  public getApplicationService(): ApplicationService {
    return this.applicationService;
  }

  public async getPublicInterview(
    interviewId: string
  ): Promise<GetPublicInterviewDTO> {
    const interview =
      await this.candidateRepository.getInterviewPublicById(interviewId);
    if (!interview) {
      throw new AppError("Interview not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (
      interview.status !== InterviewStatus.PUBLISHED &&
      interview.status !== InterviewStatus.ACTIVE
    ) {
      throw new AppError(
        "This interview is not accessible.",
        ErrorCodes.FORBIDDEN,
        403
      );
    }

    if (
      interview.expirationDate &&
      interview.expirationDate.getTime() < Date.now()
    ) {
      throw new AppError(
        "This interview is expired.",
        ErrorCodes.FORBIDDEN,
        403
      );
    }

    return {
      interviewId: (interview._id as Types.ObjectId).toString(),
      title: interview.title,
      createdAt: interview.createdAt ?? new Date(),
      expirationDate: interview.expirationDate,
      status: interview.status,
      personalityTest: interview.personalityTestId
        ? { id: interview.personalityTestId.toString(), required: true }
        : null, // Eğer test yoksa null döneceğiz
      stages: interview.stages,
      questions: interview.questions.map((q) => ({
        _id: (q as any)._id?.toString(), // MongoDB subdoc ID - migration ile eklendi
        questionText: q.questionText,
        order: q.order,
        duration: q.duration,
      })),
    };
  }

  /**
   * Aday form verilerini gönderir -> Uygulama kaydı oluşturulur -> OTP kodu oluşturup SMS gönderilir.
   */
  public async createApplication(
    data: CreateApplicationDTO
  ): Promise<IApplication> {
    const interview = await this.interviewRepository.getInterviewById(
      data.interviewId
    );
    if (!interview) {
      throw new AppError("Interview not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (
      interview.status !== InterviewStatus.PUBLISHED &&
      interview.status !== InterviewStatus.ACTIVE
    ) {
      throw new AppError(
        "Interview is not accessible",
        ErrorCodes.FORBIDDEN,
        403
      );
    }
    const existingApplication =
      await this.candidateRepository.getApplicationByEmailAndInterview(
        data.email,
        data.interviewId
      );

    if (existingApplication) {
      throw new AppError(
        "You have already applied for this interview.",
        ErrorCodes.BAD_REQUEST,
        400
      );
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
        verificationAttempts: 0, // ✅ Yeni field
        kvkkConsent: data.kvkkConsent,
      },
      status: "pending",
    };

    const createdApp =
      await this.candidateRepository.createApplication(applicationData);

    console.log(`SMS sent to ${data.phone} with code ${otpCode}`);

    return {
      ...createdApp.toObject(),
      personalityTestRequired: interview.personalityTestId ? true : false, // ✅ Kişilik testi bilgisi eklendi
    };
  }

  /**
   * OTP kodu doğrulama -> phoneVerified = true
   */
  public async verifyOtp(data: VerifyOtpDTO): Promise<VerifyOtpResponseDTO> {
    const { applicationId, otpCode } = data;

    const application =
      await this.candidateRepository.getApplicationByIdWithVerification(
        applicationId
      );
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    let newOtpSent = false; // ✅ Yeni OTP gönderildi mi?
    if (
      application.candidate.verificationExpiresAt &&
      application.candidate.verificationExpiresAt < new Date()
    ) {
      const newOtp = generateRandomCode(6);
      application.candidate.verificationCode = newOtp;
      application.candidate.verificationExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );
      newOtpSent = true; // ✅ Yeni OTP oluşturulduğunu işaretle

      await application.save();
      console.log(`New OTP sent to ${application.candidate.phone}: ${newOtp}`);
    }

    if (application.candidate.verificationCode !== otpCode) {
      throw new AppError("Invalid OTP code", ErrorCodes.UNAUTHORIZED, 401);
    }

    application.candidate.phoneVerified = true;
    application.candidate.verificationCode = undefined;

    const updatedApp = await this.candidateRepository.updateApplicationById(
      applicationId,
      application
    );
    if (!updatedApp) {
      throw new AppError(
        "Could not update application",
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500
      );
    }

    const token = generateCandidateToken(applicationId);

    return { token, application: updatedApp, newOtpSent }; // ✅ Yeni alan eklendi
  }

  public async resendOtp(applicationId: string): Promise<{ expiresAt: Date }> {
    const application =
      await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (application.candidate.phoneVerified) {
      throw new AppError("Phone already verified", ErrorCodes.BAD_REQUEST, 400);
    }

    const newOtp = generateRandomCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // ✅ Yeni OTP süresi eklendi
    application.candidate.verificationCode = newOtp;
    application.candidate.verificationExpiresAt = expiresAt;

    await application.save();

    console.log(`Resent OTP to ${application.candidate.phone}: ${newOtp}`);

    return { expiresAt }; // ✅ Yeni alan eklendi
  }

  /**
   * Aday detay bilgilerini güncelleme işlemi.
   */
  public async updateCandidateDetails(data: UpdateCandidateDTO) {
    const { applicationId, education, experience, skills } = data;

    const application =
      await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    // ✅ Varsayılan değerleri atayarak undefined hatasını önlüyoruz
    application.education = education ?? application.education;

    application.experience =
      experience?.map((exp) => ({
        company: exp.company,
        position: exp.position,
        duration: exp.duration,
        responsibilities: exp.responsibilities ?? "",
      })) ?? application.experience;

    application.skills = {
      technical: skills?.technical ?? application.skills?.technical ?? [],
      personal: skills?.personal ?? application.skills?.personal ?? [],
      languages: skills?.languages ?? application.skills?.languages ?? [],
    };

    application.status = "in_progress";

    const updatedApplication = await this.candidateRepository.updateCandidate(
      applicationId,
      application
    );

    if (!updatedApplication) {
      throw new AppError(
        "Could not update candidate",
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500
      );
    }

    return {
      ...updatedApplication.toObject(),
      completed: true, // ✅ Başvuru tamamlandı bilgisi eklendi
    };
  }

  /**
   * Session bilgilerini getirme (Resume için)
   * Authenticate edilmiş adayın application bilgilerini getirir
   */
  public async getApplicationSession(applicationId: string): Promise<any> {
    const application =
      await this.candidateRepository.getApplicationById(applicationId);

    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    // Interview bilgilerini de getirelim
    const interview = await this.interviewRepository.getInterviewById(
      application.interviewId.toString()
    );

    if (!interview) {
      throw new AppError("Interview not found", ErrorCodes.NOT_FOUND, 404);
    }

    return {
      application: {
        _id: application._id,
        status: application.status,
        candidate: application.candidate,
        education: application.education || [],
        experience: application.experience || [],
        skills: application.skills || {},
        documents: application.documents || {},
        responses: application.responses || [],
      },
      interview: {
        _id: interview._id,
        title: interview.title,
        description: interview.description,
        position: interview.position,
        stages: interview.stages,
        questions: interview.questions.map((q) => ({
          _id: (q as any)._id?.toString(),
          questionText: q.questionText,
          order: q.order,
          duration: q.duration,
        })),
      },
    };
  }

  /**
   * ✅ Dosya (CV, Sertifika) yüklemek için Presigned URL verir.
   */
  public async getUploadUrl(
    applicationId: string,
    fileType: string,
    fileName: string
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const application =
      await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    // Klasör belirleme
    let folder = "others";
    if (fileType === "application/pdf") folder = "documents";
    else if (fileType.startsWith("image/")) folder = "images";

    // Dosya anahtarı (key) oluştur
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `applications/${applicationId}/${folder}/${Date.now()}-${safeFileName}`;

    // S3 Presigned URL oluştur
    const uploadUrl = await s3Service.getUploadPresignedUrl(
      key,
      fileType,
      3600
    );

    return { uploadUrl, fileKey: key };
  }

  /**
   * ✅ Video yüklemek için Presigned URL verir.
   */
  public async getVideoUploadUrl(
    applicationId: string,
    questionId: string,
    contentType: string
  ): Promise<{ uploadUrl: string; videoKey: string }> {
    const application =
      await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    // Video anahtarı (key) oluştur
    const videoKey = `videos/${applicationId}/${questionId}/${Date.now()}.webm`;

    // S3 Presigned URL oluştur
    const uploadUrl = await s3Service.getUploadPresignedUrl(
      videoKey,
      contentType,
      3600
    );

    return { uploadUrl, videoKey };
  }

  /**
   * ✅ Video yanıtını kaydeder.
   */
  public async saveVideoResponse(
    applicationId: string,
    data: { questionId: string; videoUrl: string; duration: number }
  ): Promise<IApplication | null> {
    const application =
      await this.candidateRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError("Application not found", ErrorCodes.NOT_FOUND, 404);
    }

    // QuestionId format kontrolü
    if (!data.questionId || data.questionId.length !== 24) {
      throw new AppError(
        "Invalid questionId format",
        ErrorCodes.BAD_REQUEST,
        400
      );
    }

    // Video yanıtını responses array'ine ekle
    if (!application.responses) {
      application.responses = [];
    }

    // Aynı soru için mevcut yanıt var mı kontrol et
    const existingIndex = application.responses.findIndex(
      (r) => r.questionId.toString() === data.questionId
    );

    let questionObjectId: Types.ObjectId;
    try {
      questionObjectId = new Types.ObjectId(data.questionId);
    } catch (error) {
      throw new AppError(
        "Invalid questionId format",
        ErrorCodes.BAD_REQUEST,
        400
      );
    }

    const responseData = {
      questionId: questionObjectId,
      videoUrl: data.videoUrl,
      duration: data.duration,
      uploadStatus: "completed" as const,
      uploadedAt: new Date(),
      uploadRetryCount: 0,
    };

    if (existingIndex >= 0) {
      application.responses[existingIndex] = responseData;
    } else {
      application.responses.push(responseData);
    }

    // Interview sorularını kontrol et ve tamamlandıysa status güncelle
    const interview = await this.interviewRepository.getInterviewById(
      application.interviewId.toString()
    );
    if (
      interview &&
      application.responses.length >= interview.questions.length
    ) {
      application.status = "awaiting_ai_analysis";
    } else {
      application.status = "awaiting_video_responses";
    }

    return await this.candidateRepository.updateApplicationById(
      applicationId,
      application
    );
  }
}
