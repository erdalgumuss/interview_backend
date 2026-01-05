// src/modules/application/repositories/application.repository.ts

import { Types } from 'mongoose';
import ApplicationModel, { IApplication } from '../models/application.model'; // ApplicationStatus enum'u import edildi

export class ApplicationRepository {
 
  /**
   * ✅ GÜNCELLENMIŞ METOT (FAZ 5.4.1): ID'ye göre başvuru getir (detay).
   * 
   * 📋 FAZ 5.4.1: HR için zengin detay
   * - interviewId -> title, questions (soru metni, sıra, süre)
   * - aiAnalysisResults -> tüm soru bazlı analizler
   * - latestAIAnalysisId -> en son analiz
   */
  public async getApplicationById(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel
      .findById(applicationId)
      // FAZ 5.4.1: Interview detayları - sorular dahil
      .populate({
        path: 'interviewId',
        select: 'title status expirationDate questions',
        populate: {
          path: 'questions',
          select: 'questionText order duration expectedAnswer keywords'
        }
      })
      // FAZ 5.4.1: Tüm AI analiz sonuçları (soru bazlı)
      .populate({
        path: 'aiAnalysisResults',
        select: 'questionId overallScore communicationScore technicalSkillsScore problemSolvingScore personalityMatchScore transcriptionText strengths improvementAreas recommendation pipelineStatus evaluationResult faceScores voiceScores analyzedAt'
      })
      // FAZ 5.4.2: En son AI analizi
      .populate({
        path: 'latestAIAnalysisId',
        select: 'overallScore communicationScore technicalSkillsScore problemSolvingScore personalityMatchScore strengths improvementAreas recommendation analyzedAt evaluationResult'
      })
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
   * ✅ GÜNCELLENMIŞ METOT (FAZ 5.3): Dinamik Filtrelerle ve Sayfalama ile Başvuruları Getir
   * 
   * 📋 FAZ 5.3.1: Default liste = TÜM application'lar (AI filtresi varsayılan değil)
   * 📋 FAZ 5.3.2: analysisStatus filtresi: 'all' | 'completed' | 'pending'
   * 📋 FAZ 5.3.3: aiScoreMin SADECE analizli application'lar için çalışır
   */
  public async getFilteredApplications(
    filters: any,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ applications: IApplication[], total: number }> {
    
    // 1) Temel sorgu (match) objesi - DEFAULT: Sadece yetki + interview filtresi
    const match: any = {};
    
    // NOT: InterviewRepository'den kullanıcının sahip olduğu tüm mülakat ID'leri çekilmelidir.
    // Şimdilik sadece yetkili mülakatlar varsayılarak filtreleme yapalım.
    // Gerçek uygulamada: match.interviewId: { $in: [userInterviewIds] } gibi bir yetki filtresi olmalı.

    // A) Mülakat ID Filtresi
    if (filters.interviewId) {
        match.interviewId = new Types.ObjectId(filters.interviewId as string);
    }
    
    // B) Durum Filtresi (Application Status)
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
    
    // =========================================
    // FAZ 5.3.2: Analysis Status Filtresi
    // =========================================
    // analysisStatus: 'all' | 'completed' | 'pending'
    // Default: 'all' (tüm application'lar listelenir)
    const analysisStatus = filters.analysisStatus || 'all';
    
    if (analysisStatus === 'completed') {
        // Sadece AI analizi TAMAMLANMIŞ olanlar
        match['generalAIAnalysis.overallScore'] = { $exists: true, $ne: null };
    } else if (analysisStatus === 'pending') {
        // Sadece AI analizi BEKLEYEN olanlar
        match.$and = match.$and || [];
        match.$and.push({
            $or: [
                { 'generalAIAnalysis.overallScore': { $exists: false } },
                { 'generalAIAnalysis.overallScore': null }
            ]
        });
    }
    // analysisStatus === 'all' ise hiçbir AI filtresi eklenmez (FAZ 5.3.1)

    // =========================================
    // FAZ 5.3.3: AI Skor Filtresi (Güvenli)
    // =========================================
    // aiScoreMin SADECE analysisStatus !== 'pending' ise çalışır
    if (filters.aiScoreMin !== undefined && analysisStatus !== 'pending') {
        const minScore = parseInt(filters.aiScoreMin as string);
        if (!isNaN(minScore) && minScore > 0) {
            // aiScoreMin kullanıldığında otomatik olarak sadece analizli olanları filtrele
            match['generalAIAnalysis.overallScore'] = { 
                ...match['generalAIAnalysis.overallScore'],
                $gte: minScore 
            };
        }
    }

    // 2) Toplam belge sayısını bulma (Sayfalama için)
    const total = await ApplicationModel.countDocuments(match);

    // 3) Sorguyu çalıştırma
    const applications = await ApplicationModel.find(match)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('interviewId', 'title')
        .exec();

    return { applications, total };
  }
}
