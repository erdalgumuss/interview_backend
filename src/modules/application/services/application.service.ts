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

    // 2) Mülakatı getir
    const interviewId = application.interviewId.toString();
    const interview = await this.interviewRepository.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 3) Mülakat sahibi mi kontrol et
    //    interview.createdBy.userId === userId
    if (interview.createdBy.userId.toString() !== userId) {
      throw new AppError(
        'Forbidden: You are not the owner of this interview',
        ErrorCodes.FORBIDDEN,
        403
      );
    }

    return application;
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
   * @param newStatus Yeni durum ('pending', 'rejected', 'accepted')
   * @param userId Durumu güncelleyen HR kullanıcının ID'si
   */
  public async updateApplicationStatus(
    applicationId: string, 
    newStatus: 'pending' | 'rejected' | 'accepted', 
    userId: string
  ): Promise<IApplication> {
    
    // 1) Başvuru var mı ve yetkili kullanıcı mı kontrolü (Aynı logic kullanılıyor)
    // Mevcut getApplicationById metodu zaten hem varlık hem de yetki kontrolü yapıyor
    const application = await this.getApplicationById(applicationId, userId);

    // 2) Yeni durumun geçerliliğini kontrol et (DTO zaten yaptı ama Service'de de emin olalım)
    if (!['pending', 'rejected', 'accepted'].includes(newStatus)) {
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
}

