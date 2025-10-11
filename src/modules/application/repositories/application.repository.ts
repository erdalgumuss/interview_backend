// src/modules/application/repositories/application.repository.ts

import { Types } from 'mongoose';
import ApplicationModel, { IApplication } from '../models/application.model'; // ApplicationStatus enum'u import edildi

export class ApplicationRepository {
 
  /**
   * ID'ye göre başvuru getir (detay).
   */
  public async getApplicationById(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel
      .findById(applicationId)
      .populate('interviewId', 'title status expirationDate') 
      .populate('aiAnalysisResults')
      .populate('latestAIAnalysisId') // Eklenebilir
      .exec();
  }


  /**
   * Bir mülakata (Interview) ait tüm başvuruları getir.
   * Yetki bazlı veya sayfalama ihtiyacı varsa parametrelerle genişletilebilir.
   */
  public async getApplicationsByInterview(
    interviewId: string,
    page = 1,
    limit = 10
  ): Promise<IApplication[]> {
    return ApplicationModel
      .find({ interviewId })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Adayın e-posta adresiyle eşleşen başvuruları getir.
   */
  public async getApplicationsByEmail(email: string): Promise<IApplication[]> {
    return ApplicationModel
      .find({ 'candidate.email': email })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Bir başvuru ID'si için tüm destek taleplerini getir.
   */
  public async getSupportRequests(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel
      .findById(applicationId, { supportRequests: 1 })
      .exec();
  }


  /**
   * Başvuruda yeni bir 'supportRequest' ekle.
   * Burada $push operatörünü kullanıyoruz.
   */
  public async addSupportRequest(
    applicationId: string,
    message: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $push: {
          supportRequests: {
            timestamp: new Date(),
            message,
          },
        },
      },
      { new: true }
    ).exec();
  }


  /**
   * Hard delete - Tamamen siler.
   */
  public async deleteApplicationById(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndDelete(applicationId).exec();
  }

  /**
   * Soft Delete - Başvurunun status alanını 'canceled' yapabilir veya 'deletedAt' eklenebilir.
   */
  public async softDeleteApplicationById(
    applicationId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      { status: 'rejected' }, // 'canceled' yerine geçerli bir enum kullanıldı
      { new: true }
    ).exec();
  }
/**
   * ✅ YENİ METOT: Başvuru Durumunu Güncelle
   * @param applicationId Güncellenecek başvuru ID'si
   * @param newStatus Yeni durum
   */
  public async updateApplicationStatus(
    applicationId: string, 
    newStatus: 'pending' | 'rejected' | 'accepted'
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
        applicationId,
        { status: newStatus },
        { new: true }
    ).exec();
  }


  /**
   * ✅ YENİ METOT: Dinamik Filtrelerle ve Sayfalama ile Başvuruları Getir
   * Projenin en karmaşık sorgularından biri.
   */
  public async getFilteredApplications(
    filters: any,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ applications: IApplication[], total: number }> {
    
    // 1) Temel sorgu (match) objesi oluşturuluyor
    const match: any = {};
    
    // NOT: InterviewRepository'den kullanıcının sahip olduğu tüm mülakat ID'leri çekilmelidir.
    // Şimdilik sadece yetkili mülakatlar varsayılarak filtreleme yapalım.
    // Gerçek uygulamada: match.interviewId: { $in: [userInterviewIds] } gibi bir yetki filtresi olmalı.

    // A) Mülakat ID Filtresi
    if (filters.interviewId) {
        match.interviewId = new Types.ObjectId(filters.interviewId as string);
    }
    
    // B) Durum Filtresi
    if (filters.status && filters.status !== 'all') {
        // Durum filtresi Array veya tek değer olabilir
        if (Array.isArray(filters.status)) {
            match.status = { $in: filters.status };
        } else {
            match.status = filters.status;
        }
    }
    
    // C) Aday Adı/Soyadı/Email Arama
    if (filters.query) {
        const regex = new RegExp(filters.query as string, 'i'); // Case-insensitive
        match.$or = [
            { 'candidate.name': regex },
            { 'candidate.surname': regex },
            { 'candidate.email': regex },
        ];
    }
    
    // D) AI Skoru Filtresi (Örn: aiScoreMin=70)
    if (filters.aiScoreMin) {
        const minScore = parseInt(filters.aiScoreMin as string);
        if (!isNaN(minScore)) {
            match['generalAIAnalysis.overallScore'] = { $gte: minScore };
        }
    }

    // 2) Toplam belge sayısını bulma (Sayfalama için)
    const total = await ApplicationModel.countDocuments(match);

    // 3) Sorguyu çalıştırma
    const applications = await ApplicationModel.find(match)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        // Populate gerekli ise buraya eklenir
        .populate('interviewId', 'title') // Mülakat başlığını getir
        .select('+generalAIAnalysis.overallScore') // Skoru döndürmek için seç
        .exec();

    return { applications, total };
  }
}
