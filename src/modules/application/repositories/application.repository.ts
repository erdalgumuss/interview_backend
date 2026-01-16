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
   * Filtre ile başvuru sayısını getir
   */
  public async countByFilter(filter: any): Promise<number> {
    return ApplicationModel.countDocuments(filter).exec();
  }

  /**
   * Filtre ile başvuruları getir (sayfalama ve sıralama destekli)
   */
  public async getApplicationsByFilter(
    filter: any,
    options: { page: number; limit: number; sort: any }
  ): Promise<IApplication[]> {
    const { page, limit, sort } = options;
    
    return ApplicationModel
      .find(filter)
      .populate('interviewId', 'title status expirationDate')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
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
    newStatus: 'pending' | 'otp_verified' | 'awaiting_video_responses' | 'in_progress' | 'awaiting_ai_analysis' | 'completed' | 'rejected' | 'accepted'
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
   * Use case optimized index'leri kullanır.
   */
  public async getFilteredApplications(
    filters: any,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ applications: IApplication[], total: number }> {
    
    // 1) Temel sorgu (match) objesi oluşturuluyor
    const match: any = { deletedAt: null }; // Soft delete kontrolü
    
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
    
    // D) AI Skoru Filtresi (scoreSummary.overallScore kullan - optimize)
    if (filters.minScore || filters.maxScore) {
        match['scoreSummary.overallScore'] = {};
        if (filters.minScore) {
            match['scoreSummary.overallScore'].$gte = parseInt(filters.minScore as string);
        }
        if (filters.maxScore) {
            match['scoreSummary.overallScore'].$lte = parseInt(filters.maxScore as string);
        }
    }
    
    // E) Favori Filtresi
    if (filters.isFavorite === true) {
        match.favoritedBy = new Types.ObjectId(userId);
    }
    
    // F) İnceleme Durumu Filtresi
    if (filters.isReviewed === true) {
        match.reviewedBy = { $exists: true, $ne: null };
    } else if (filters.isReviewed === false) {
        match.reviewedBy = { $exists: false };
    }
    
    if (filters.reviewedBy) {
        match.reviewedBy = new Types.ObjectId(filters.reviewedBy as string);
    }
    
    // G) Tarih Aralığı Filtresi
    if (filters.dateFrom || filters.dateTo) {
        match.createdAt = {};
        if (filters.dateFrom) {
            match.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
            match.createdAt.$lte = new Date(filters.dateTo);
        }
    }

    // 2) Toplam belge sayısını bulma (Sayfalama için)
    const total = await ApplicationModel.countDocuments(match);
    
    // 3) Sıralama
    const sortOptions: any = {};
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    if (sortBy === 'score') {
        sortOptions['scoreSummary.overallScore'] = sortOrder;
    } else if (sortBy === 'name') {
        sortOptions['candidate.name'] = sortOrder;
    } else {
        sortOptions[sortBy] = sortOrder;
    }

    // 4) Sorguyu çalıştırma - Index'leri kullanır
    const applications = await ApplicationModel.find(match)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sortOptions)
        .populate('interviewId', 'title department') // Mülakat başlığını getir
        .populate('reviewedBy', 'name email') // İnceleyen İK bilgisi
        .select('+scoreSummary') // Skoru döndürmek için seç
        .exec();

    return { applications, total };
  }

  /**
   * ✅ YENİ: İK Notu Ekle
   */
  public async addHRNote(
    applicationId: string,
    note: {
      authorId: string;
      authorName: string;
      content: string;
      isPrivate: boolean;
    }
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $push: {
          hrNotes: {
            authorId: new Types.ObjectId(note.authorId),
            authorName: note.authorName,
            content: note.content,
            isPrivate: note.isPrivate,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: İK Notu Güncelle
   */
  public async updateHRNote(
    applicationId: string,
    noteId: string,
    updates: { content?: string; isPrivate?: boolean }
  ): Promise<IApplication | null> {
    const updateFields: any = {};
    
    if (updates.content !== undefined) {
      updateFields['hrNotes.$.content'] = updates.content;
    }
    if (updates.isPrivate !== undefined) {
      updateFields['hrNotes.$.isPrivate'] = updates.isPrivate;
    }

    return ApplicationModel.findOneAndUpdate(
      { _id: applicationId, 'hrNotes._id': new Types.ObjectId(noteId) },
      { $set: updateFields },
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: İK Notu Sil
   */
  public async deleteHRNote(
    applicationId: string,
    noteId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $pull: {
          hrNotes: { _id: new Types.ObjectId(noteId) },
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: İK Rating Güncelle
   */
  public async updateHRRating(
    applicationId: string,
    rating: number,
    reviewerId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        hrRating: rating,
        reviewedBy: new Types.ObjectId(reviewerId),
        reviewedAt: new Date(),
      },
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: Application Progress Güncelle (Resume Logic)
   */
  public async updateApplicationProgress(
    applicationId: string,
    currentStep: string,
    completedStep?: string
  ): Promise<IApplication | null> {
    const update: any = {
      'applicationProgress.currentStep': currentStep,
      'applicationProgress.lastAccessedAt': new Date(),
      'applicationProgress.isResuming': true,
    };

    // Tamamlanan adımı ekle
    if (completedStep) {
      update.$addToSet = {
        'applicationProgress.completedSteps': completedStep,
      };
      update.$set = {
        ...update,
        [`applicationProgress.stepCompletionDates.${completedStep}`]: new Date(),
      };
    }

    return ApplicationModel.findByIdAndUpdate(applicationId, update, { new: true }).exec();
  }

  /**
   * ✅ YENİ: Email ile Son Erişilen Başvuruyu Getir (Resume Logic)
   */
  public async getLastAccessedApplication(email: string): Promise<IApplication | null> {
    return ApplicationModel.findOne({
      'candidate.email': email,
      status: { $nin: ['completed', 'rejected', 'accepted'] }, // Final state'ler hariç
      deletedAt: null,
    })
      .sort({ 'applicationProgress.lastAccessedAt': -1 })
      .exec();
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
  ): Promise<IApplication | null> {
    const update: any = {
      'responses.$.uploadStatus': uploadStatus,
      'responses.$.lastUploadAttempt': new Date(),
    };

    if (uploadStatus === 'completed') {
      update['responses.$.uploadedAt'] = new Date();
    }

    if (uploadStatus === 'failed' && uploadError) {
      update['responses.$.uploadError'] = uploadError;
      update.$inc = { 'responses.$.uploadRetryCount': 1 };
    }

    if (s3Metadata) {
      update['responses.$.s3Metadata'] = s3Metadata;
    }

    return ApplicationModel.findOneAndUpdate(
      { _id: applicationId, 'responses.questionId': new Types.ObjectId(questionId) },
      update,
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: Video Upload Başarısız Olanları Getir (Retry Queue)
   */
  public async getFailedVideoUploads(limit: number = 100): Promise<IApplication[]> {
    return ApplicationModel.find({
      'responses.uploadStatus': 'failed',
      'responses.uploadRetryCount': { $lt: 3 }, // Max 3 retry
      deletedAt: null,
    })
      .limit(limit)
      .exec();
  }

  /**
   * ✅ YENİ: Score Summary Güncelle (AI Analiz Sonrası)
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
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          'scoreSummary.overallScore': scoreSummary.overallScore,
          'scoreSummary.technicalSkillsScore': scoreSummary.technicalSkillsScore,
          'scoreSummary.communicationScore': scoreSummary.communicationScore,
          'scoreSummary.problemSolvingScore': scoreSummary.problemSolvingScore,
          'scoreSummary.personalityMatchScore': scoreSummary.personalityMatchScore,
          'scoreSummary.analyzedResponses': scoreSummary.analyzedResponses,
          'scoreSummary.lastAnalysisDate': new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * ✅ YENİ: Toggle Favorite (Add/Remove)
   */
  public async toggleFavorite(
    applicationId: string,
    userId: string,
    action: 'add' | 'remove'
  ): Promise<IApplication | null> {
    const userObjectId = new Types.ObjectId(userId);
    
    if (action === 'add') {
      return ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $addToSet: { favoritedBy: userObjectId } },
        { new: true }
      ).exec();
    } else {
      return ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $pull: { favoritedBy: userObjectId } },
        { new: true }
      ).exec();
    }
  }
}
