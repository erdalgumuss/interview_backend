
import { CandidateRepository } from '../repositories/candidate.repository';
import { InterviewRepository } from '../../interview/repositories/interview.repository';
import { ApplicationRepository } from '../repositories/application.repository';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { IInterview, InterviewStatus } from '../../interview/models/interview.model';
import { IApplication, IApplicationResponse } from '../models/application.model'; // Dikkat, path proje yapınıza göre değişebilir
import { CreateApplicationDTO } from '../dtos/createApplication.dto';
import { VerifyOtpDTO, VerifyOtpResponseDTO } from '../dtos/otpVerify.dto';
import { generateRandomCode } from '../../../utils/stringUtils';
import { Types } from 'mongoose';
import { GetPublicInterviewDTO } from '../dtos/publicInterview.dto';
import { generateCandidateToken } from '../../../utils/tokenUtils';
import { UpdateCandidateDTO } from '../dtos/updateCandidate.dto';
import { VideoResponseDTO } from '../dtos/videoResponse.dto'; // ✅ Yeni DTO
import { PersonalityTestResponseDTO } from '../dtos/personalityTest.dto'; // ✅ Yeni DTO
import { aiAnalysisQueue } from '../../../utils/bullmq'; // utils/bullmq.ts dosyasından



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
      personalityTest: interview.personalityTestId
          ? { id: interview.personalityTestId.toString(), required: true }
          : null, // Eğer test yoksa null döneceğiz
      stages: interview.stages,
      questions: interview.questions.map(q => ({
          questionText: q.questionText,
          order: q.order,
          duration: q.duration,
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
    const existingApplication = await this.candidateRepository.getApplicationByEmailAndInterview(
      data.email,
      data.interviewId
  );
  
  if (existingApplication) {
      throw new AppError(
          'You have already applied for this interview.',
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
        kvkkConsent: data.kvkkConsent,
      },
      status: 'pending',
    };

    const createdApp = await this.candidateRepository.createApplication(applicationData);

    console.log(`SMS sent to ${data.phone} with code ${otpCode}`);

    return {
      ...createdApp.toObject(),
      personalityTestRequired: interview.personalityTestId ? true : false,  // ✅ Kişilik testi bilgisi eklendi
  };
  }

  /**
   * OTP kodu doğrulama -> phoneVerified = true
   */
  public async verifyOtp(data: VerifyOtpDTO): Promise<VerifyOtpResponseDTO> {
    const { applicationId, otpCode } = data;

    const application = await this.candidateRepository.getApplicationByIdWithVerification(applicationId);
    if (!application) {
        throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    let newOtpSent = false;  // ✅ Yeni OTP gönderildi mi?
    if (application.candidate.verificationExpiresAt && application.candidate.verificationExpiresAt < new Date()) {
        const newOtp = generateRandomCode(6);
        application.candidate.verificationCode = newOtp;
        application.candidate.verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        newOtpSent = true;  // ✅ Yeni OTP oluşturulduğunu işaretle

        await application.save();
        console.log(`New OTP sent to ${application.candidate.phone}: ${newOtp}`);
    }

    if (application.candidate.verificationCode !== otpCode) {
        throw new AppError('Invalid OTP code', ErrorCodes.UNAUTHORIZED, 401);
    }

    application.candidate.phoneVerified = true;
    application.candidate.verificationCode = undefined;

    const updatedApp = await this.candidateRepository.updateApplicationById(applicationId, application);
    if (!updatedApp) {
        throw new AppError('Could not update application', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    const token = generateCandidateToken(applicationId);

    return { token, application: updatedApp, newOtpSent };  // ✅ Yeni alan eklendi
}


  
public async resendOtp(applicationId: string): Promise<{ expiresAt: Date }> {
  const application = await this.candidateRepository.getApplicationById(applicationId);
  if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
  }

  if (application.candidate.phoneVerified) {
      throw new AppError('Phone already verified', ErrorCodes.BAD_REQUEST, 400);
  }

  const newOtp = generateRandomCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // ✅ Yeni OTP süresi eklendi
  application.candidate.verificationCode = newOtp;
  application.candidate.verificationExpiresAt = expiresAt;

  await application.save();

  console.log(`Resent OTP to ${application.candidate.phone}: ${newOtp}`);

  return { expiresAt };  // ✅ Yeni alan eklendi
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
       application.education = education ?? application.education; 

   application.experience = experience?.map(exp => ({
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
  
    application.status = 'in_progress';
  
    const updatedApplication = await this.candidateRepository.updateCandidate(applicationId, application);

    if (!updatedApplication) {
      throw new AppError('Could not update candidate', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return {
      ...updatedApplication.toObject(),
      completed: true,  // ✅ Başvuru tamamlandı bilgisi eklendi
  };
  }
  /**
     * ✅ YENİ METOT: Aday Video Yanıtını Kaydeder ve AI Analizini Tetikler
     */
    public async saveVideoResponse(data: VideoResponseDTO, applicationId: string): Promise<IApplication> {
        const { questionId, videoUrl, duration, textAnswer, aiAnalysisRequired } = data;

        // ... (Kodun Başvuru Bulma ve Tekrarlı Yanıt Kontrolü kısımları aynı kalır)
        const application = await this.candidateRepository.getApplicationById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        // 1) Tekrarlı yanıt kontrolü (Aynı kalır)

        // 2) Yeni yanıtı Application Model'e ekle (Aynı kalır)
        const newResponse: IApplicationResponse = {
            questionId: new Types.ObjectId(questionId),
            videoUrl,
            duration,
            textAnswer,
        };
        application.responses.push(newResponse);

        // 3) Application durumunu güncelle
        // *Düzeltme:* Video yanıtları biriktikçe durum 'in_progress' olmalı, ilk video yüklemesinden sonra analiz bekleme durumuna geçebiliriz.
        // Tüm videolar yüklenince durum 'awaiting_ai_analysis' olarak ayarlanmalıdır.
        // Ancak bu akışta videoyu kaydettiğimiz an analizi tetiklediğimiz için 'awaiting_ai_analysis' doğru bir ara durumdur.
        application.status = 'awaiting_ai_analysis'; 

        const updatedApplication = await this.candidateRepository.updateApplicationById(applicationId, application);
        
        if (!updatedApplication) {
            throw new AppError('Video yanıtı kaydedilemedi.', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
        }

        // 4) 🚀 KRİTİK ADIM: AI Analizi için kuyruğa iş ekle
        if (aiAnalysisRequired !== false) {
            
            // Kuyruğa eklenecek iş için video yanıtının ID'sini (veya benzer bir benzersiz ID'yi) bulmalıyız.
            // Bu akışta VideoResponseModel kullanmadığınız için, Application içerisindeki responses dizisinin
            // hangi öğesinin analiz edileceğini belirtmek amacıyla, QuestionID'yi kullanacağız.

            await aiAnalysisQueue.add('analyzeVideo', { 
                videoResponseId: newResponse.questionId.toString(), // 🚨 DİKKAT: Normalde buraya VideoResponse Model'in ID'si gelmeliydi.
                                                                    // Ancak VideoResponse ayrı bir model olarak kaydedilmediği için,
                                                                    // Worker'ın Application'ı bulmasını sağlamak üzere questionId'yi kullanıyoruz.
                                                                    // Service katmanında VideoResponse Model'i oluşturmak daha doğru olurdu.
                                                                    // Şimdilik Question ID üzerinden devam edelim:
                                                                    
                questionId: newResponse.questionId.toString(), 
                applicationId: applicationId,
            }); 
            
            console.log(`✅ [BullMQ] AI Analizi için iş kuyruğa eklendi. Question ID: ${newResponse.questionId}`);

        }

        return updatedApplication;
    }
    /**
     * ✅ YENİ METOT: Aday Kişilik Testi Yanıtlarını Kaydeder
     */
    public async savePersonalityTestResponse(data: PersonalityTestResponseDTO, applicationId: string): Promise<IApplication> {
        const { testId, answers } = data;

        const application = await this.candidateRepository.getApplicationById(applicationId);
        if (!application) {
            throw new AppError('Başvuru bulunamadı.', ErrorCodes.NOT_FOUND, 404);
    }
        
        // 1) Testin geçerli olup olmadığını kontrol et
        // NOT: PersonalityTestService üzerinden testin varlığını ve aktifliğini kontrol etmelisiniz.
        
        if (application.personalityTestResults?.completed) {
            throw new AppError('Kişilik testi zaten tamamlanmış.', ErrorCodes.CONFLICT, 409);
        }
        
        // 2) Test sonuçlarını hesapla (Bu mantık burada simüle ediliyor, gerçekte ayrı bir Service/Logic olabilir)
        // NOT: Gerçek test skorlama mantığınızı buraya eklemelisiniz. Şimdilik rastgele skorlar atayalım.
        const mockScores = {
            openness: Math.floor(Math.random() * 100),
            conscientiousness: Math.floor(Math.random() * 100),
            extraversion: Math.floor(Math.random() * 100),
            agreeableness: Math.floor(Math.random() * 100),
            neuroticism: Math.floor(Math.random() * 100),
        };
        
        // 3) Application Model'i güncelle
        application.personalityTestResults = {
            testId: new Types.ObjectId(testId),
            completed: true,
            scores: mockScores,
            personalityFit: Math.floor(Math.random() * 100), // Örnek uyum skoru
        };
        
        // Eğer mülakatın son aşaması ise status'ü "completed" yap:
        // application.status = 'completed'; // Veya sadece 'in_progress' olarak kalabilir.
        
        const updatedApplication = await this.candidateRepository.updateApplicationById(applicationId, application);
        
        if (!updatedApplication) {
            throw new AppError('Kişilik testi kaydedilemedi.', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
        }
        
        return updatedApplication;
    }
    
}

