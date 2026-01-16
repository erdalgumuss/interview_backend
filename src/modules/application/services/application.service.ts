import { ApplicationRepository } from '../repositories/application.repository';
import { InterviewRepository } from '../../interview/repositories/interview.repository';
import { IApplication } from '../models/application.model';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';

export class ApplicationService {
  private applicationRepository: ApplicationRepository;
  private interviewRepository: InterviewRepository;

  constructor() {
    this.applicationRepository = new ApplicationRepository();
    this.interviewRepository = new InterviewRepository();
  }

  /**
   * Tek bir başvuruyu görüntüleme (Sadece mülakatı oluşturan kullanıcı).
   * userId: Şu an oturum açan kullanıcının id'si (HR)
   */
  public async getApplicationById(applicationId: string, userId: string): Promise<IApplication> {
    // 1) Başvuru var mı?
    const application = await this.applicationRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) interviewId kontrolü
    if (!application.interviewId) {
      throw new AppError('Application has no associated interview', ErrorCodes.BAD_REQUEST, 400);
    }

    // 3) Mülakatı getir
    // interviewId zaten populate edilmiş olabilir veya ObjectId olabilir
    let interviewId: string;
    
    if (typeof application.interviewId === 'object' && 'toString' in application.interviewId) {
      // Mongoose ObjectId veya populated document ise
      interviewId = (application.interviewId as any)._id 
        ? (application.interviewId as any)._id.toString() 
        : application.interviewId.toString();
    } else {
      // String ise direkt kullan
      interviewId = String(application.interviewId);
    }
    
    const interview = await this.interviewRepository.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    // Interview owner ID'yi düzgün şekilde al
    // createdBy.userId populate edilmiş olabilir veya ObjectId olabilir
    const userIdField = interview.createdBy.userId as any;
    let interviewOwnerId: string;
    
    if (userIdField && typeof userIdField === 'object' && userIdField._id) {
      // Populate edilmiş user objesi ise _id'yi al
      interviewOwnerId = userIdField._id.toString();
    } else if (userIdField) {
      // ObjectId veya string ise direkt string'e çevir
      interviewOwnerId = String(userIdField);
    } else {
      throw new AppError('Interview owner information is missing', ErrorCodes.BAD_REQUEST, 400);
    }

    // Debug: Interview owner kontrolü
    console.log('🔍 Interview Owner Check:', {
      interviewOwnerId,
      currentUserId: userId,
      match: interviewOwnerId === userId
    });

    // Mülakat sahibi kontrolü
    if (interviewOwnerId !== userId) {
      throw new AppError(
        'Forbidden: You are not the owner of this interview',
        ErrorCodes.FORBIDDEN,
        403
      );
    }

    return application;
  }

  /**
   * ✅ YENİ METOT: Belirli Bir Mülakata Ait Başvuruları Getir
   * Interview ID'ye göre başvuruları sayfalama ve filtreleme ile döner.
   */
  public async getApplicationsByInterviewId(
    interviewId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<{ applications: IApplication[], total: number }> {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    // Filtre objesi oluştur
    const filter: any = { interviewId };
    
    // Soft delete edilmemişleri getir
    filter.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
    
    // Status filtresi
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Sıralama
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Toplam sayıyı al
    const total = await this.applicationRepository.countByFilter(filter);

    // Başvuruları getir
    const applications = await this.applicationRepository.getApplicationsByFilter(
      filter,
      { page, limit, sort }
    );

    return { applications, total };
  }

  /**
   * ✅ YENİ METOT: Başvuru Listesi ve Filtreleme
   * HR kullanıcısının yetkili olduğu mülakatlara ait başvuruları filtreler.
   */
  public async getAllApplications(
    filters: any, 
    userId: string
  ): Promise<{ applications: IApplication[], total: number, page: number, limit: number }> {
    
    // 1) Sayfalama ve limit değerlerini ayarla
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    
    // 2) Yetki ve Filtre Mantığı: HR kullanıcısı sadece kendi mülakatlarını görmeli.
    // İlk olarak kullanıcının sahip olduğu tüm mülakat ID'lerini çekmek gerekir.
    // Bu, Repository katmanında tek bir sorgu ile halledilebilir
    
    // NOT: Mülakat Repository'sine 'getUserInterviewIds' metodu eklenmesi gerekir.
    // Şimdilik sadece yetki bazlı filtrelemeyi varsayalım.
    
    // 3) Repository'yi çağır (Filtreleri, sayfalamayı ve yetkiyi ileterek)
    // NOT: Repository'deki getFilteredApplications metodu henüz yazılmadı.
    const result = await this.applicationRepository.getFilteredApplications(filters, userId, page, limit);

    return {
        applications: result.applications,
        total: result.total,
        page,
        limit,
    };
  }


  /**
   * ✅ YENİ METOT: Başvuru Durumu Güncelleme
   * @param applicationId Güncellenecek başvuru ID'si
   * @param newStatus Yeni durum
   * @param userId Durumu güncelleyen HR kullanıcının ID'si (veya 'SYSTEM')
   */
  public async updateApplicationStatus(
    applicationId: string, 
    newStatus: 'pending' | 'otp_verified' | 'awaiting_video_responses' | 'in_progress' | 'awaiting_ai_analysis' | 'completed' | 'rejected' | 'accepted', 
    userId: string
  ): Promise<IApplication> {
    
    // 1) Başvuru var mı ve yetkili kullanıcı mı kontrolü
    // SYSTEM çağrıları için yetki kontrolü atlanır
    let application: IApplication;
    if (userId !== 'SYSTEM') {
      application = await this.getApplicationById(applicationId, userId);
    } else {
      const app = await this.applicationRepository.getApplicationById(applicationId);
      if (!app) {
        throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
      }
      application = app;
    }

    // 2) Yeni durumun geçerliliğini kontrol et
    const validStatuses = [
      'pending',
      'otp_verified',
      'awaiting_video_responses',
      'in_progress',
      'awaiting_ai_analysis',
      'completed',
      'rejected',
      'accepted'
    ];
    
    if (!validStatuses.includes(newStatus)) {
        throw new AppError('Invalid status value', ErrorCodes.BAD_REQUEST, 400);
    }

    // 3) Repository'yi çağırarak durumu güncelle
    const updatedApplication = await this.applicationRepository.updateApplicationStatus(
        applicationId, 
        newStatus
    );

    if (!updatedApplication) {
        throw new AppError('Failed to update application status', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }
    
    // NOT: Durum güncellenince Notification Modülü tetiklenebilir.
    
    return updatedApplication;
  }

  /**
   * ✅ YENİ: İK Notu Ekle
   */
  public async addHRNote(
    applicationId: string,
    userId: string,
    userName: string,
    content: string,
    isPrivate: boolean
  ): Promise<IApplication> {
    // Yetki kontrolü
    const application = await this.getApplicationById(applicationId, userId);

    const updatedApplication = await this.applicationRepository.addHRNote(applicationId, {
      authorId: userId,
      authorName: userName,
      content,
      isPrivate,
    });

    if (!updatedApplication) {
      throw new AppError('Failed to add HR note', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: İK Notu Güncelle
   */
  public async updateHRNote(
    applicationId: string,
    noteId: string,
    userId: string,
    updates: { content?: string; isPrivate?: boolean }
  ): Promise<IApplication> {
    // Yetki kontrolü
    const application = await this.getApplicationById(applicationId, userId);

    // Not sahibi kontrolü (opsiyonel - sadece not sahibi güncelleyebilir)
    const note = application.hrNotes.find((n: any) => n._id?.toString() === noteId);
    if (!note) {
      throw new AppError('HR note not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (note.authorId.toString() !== userId) {
      throw new AppError('You can only update your own notes', ErrorCodes.FORBIDDEN, 403);
    }

    const updatedApplication = await this.applicationRepository.updateHRNote(
      applicationId,
      noteId,
      updates
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update HR note', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: İK Notu Sil
   */
  public async deleteHRNote(
    applicationId: string,
    noteId: string,
    userId: string
  ): Promise<IApplication> {
    // Yetki kontrolü
    const application = await this.getApplicationById(applicationId, userId);

    // Not sahibi kontrolü
    const note = application.hrNotes.find((n: any) => n._id?.toString() === noteId);
    if (!note) {
      throw new AppError('HR note not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (note.authorId.toString() !== userId) {
      throw new AppError('You can only delete your own notes', ErrorCodes.FORBIDDEN, 403);
    }

    const updatedApplication = await this.applicationRepository.deleteHRNote(
      applicationId,
      noteId
    );

    if (!updatedApplication) {
      throw new AppError('Failed to delete HR note', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: İK Rating Güncelle
   */
  public async updateHRRating(
    applicationId: string,
    rating: number,
    userId: string
  ): Promise<IApplication> {
    // Yetki kontrolü
    await this.getApplicationById(applicationId, userId);

    // Rating validasyonu
    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', ErrorCodes.BAD_REQUEST, 400);
    }

    const updatedApplication = await this.applicationRepository.updateHRRating(
      applicationId,
      rating,
      userId
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update HR rating', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: Application Progress Güncelle (Resume Logic)
   */
  public async updateApplicationProgress(
    applicationId: string,
    currentStep: string,
    completedStep?: string
  ): Promise<IApplication> {
    const application = await this.applicationRepository.getApplicationById(applicationId);

    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    const updatedApplication = await this.applicationRepository.updateApplicationProgress(
      applicationId,
      currentStep,
      completedStep
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update application progress', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: Resume Application (Email ile Son Erişilen Başvuru)
   */
  public async resumeApplication(email: string): Promise<IApplication | null> {
    const application = await this.applicationRepository.getLastAccessedApplication(email);

    if (!application) {
      return null; // Devam edilebilir başvuru yok
    }

    // İlerleme bilgisini güncelle
    await this.applicationRepository.updateApplicationProgress(
      application._id.toString(),
      application.applicationProgress.currentStep,
      undefined
    );

    return application;
  }

  /**
   * ✅ YENİ: Video Upload Status Güncelle
   */
  public async updateVideoUploadStatus(
    applicationId: string,
    questionId: string,
    uploadStatus: string,
    uploadError?: string,
    s3Metadata?: any
  ): Promise<IApplication> {
    const application = await this.applicationRepository.getApplicationById(applicationId);

    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // Video yanıtının varlığını kontrol et
    const response = application.responses.find(
      (r: any) => r.questionId.toString() === questionId
    );

    if (!response) {
      throw new AppError('Video response not found', ErrorCodes.NOT_FOUND, 404);
    }

    const updatedApplication = await this.applicationRepository.updateVideoUploadStatus(
      applicationId,
      questionId,
      uploadStatus,
      uploadError,
      s3Metadata
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update video upload status', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    // Tüm videolar tamamlandı mı kontrol et
    const allCompleted = updatedApplication.responses.every(
      (r: any) => r.uploadStatus === 'completed'
    );

    if (allCompleted && updatedApplication.status === 'in_progress') {
      // Status'u awaiting_ai_analysis'e çek
      await this.updateApplicationStatus(applicationId, 'awaiting_ai_analysis', 'SYSTEM');
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: Score Summary Güncelle (AI Modül tarafından çağrılır)
   */
  public async updateScoreSummary(
    applicationId: string,
    scoreSummary: {
      overallScore?: number;
      technicalSkillsScore?: number;
      communicationScore?: number;
      problemSolvingScore?: number;
      personalityMatchScore?: number;
      analyzedResponses: number;
    }
  ): Promise<IApplication> {
    const application = await this.applicationRepository.getApplicationById(applicationId);

    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    const updatedApplication = await this.applicationRepository.updateScoreSummary(
      applicationId,
      scoreSummary
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update score summary', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }

  /**
   * ✅ YENİ: Toggle Favorite (Add/Remove)
   */
  public async toggleFavorite(
    applicationId: string,
    userId: string,
    action: 'add' | 'remove'
  ): Promise<IApplication> {
    // 1) Yetki kontrolü - Sadece mülakat sahibi favorilere ekleyebilir
    const application = await this.getApplicationById(applicationId, userId);

    // 2) Repository'den güncelleme
    const updatedApplication = await this.applicationRepository.toggleFavorite(
      applicationId,
      userId,
      action
    );

    if (!updatedApplication) {
      throw new AppError('Failed to update favorite status', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
    }

    return updatedApplication;
  }
}

