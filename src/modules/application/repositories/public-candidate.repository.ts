// src/modules/application/repositories/public-candidate.repository.ts

import { Types } from 'mongoose';
import InterviewModel, { IInterview } from '../../interview/models/interview.model';
import ApplicationModel, { IApplication } from '../models/application.model';

export class PublicCandidateRepository { // Sınıf adını dosya ile uyumlu yaptım

  /**
   * ✅ GÜNCELLENDİ: Public endpoint için mülakat bilgisi getir.
   * * Değişiklikler:
   * 1. Status kontrolü (Business Logic) buradan kaldırıldı -> Service'e taşındı.
   * 2. 'description' ve 'type' alanları eklendi (DTO ile uyumluluk).
   */
  public async getInterviewPublicById(interviewId: string): Promise<IInterview | null> {
    const interview = await InterviewModel.findById(interviewId, {
      _id: 1,
      createdAt: 1,
      title: 1,
      description: 1,        // ✅ YENİ: Adayın açıklamayı görmesi için
      type: 1,               // ✅ YENİ: Mülakat formatı (async-video vb.)
      expirationDate: 1,
      status: 1,
      personalityTestId: 1,
      stages: 1,
      'questions.questionText': 1,
      'questions.order': 1,
      'questions.duration': 1,
      // expectedAnswer, keywords, evaluationCriteria GİZLİ KALIYOR 🔒
    }).exec();

    return interview;
  }

  public async getApplicationByIdWithVerification(
    applicationId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findById(applicationId)
      .select('+candidate.verificationCode')
      .exec();
  }

  /**
   * Yeni bir başvuru (Application) oluştur.
   */
  public async createApplication(data: Partial<IApplication>): Promise<IApplication> {
    const application = new ApplicationModel(data);
    return application.save();
  }

  /**
   * Adayın başvurusunu getir.
   */
  public async getApplicationById(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel.findById(applicationId).exec();
  }

  /**
   * Adayın kişisel bilgilerini güncelle.
   */
  public async updateCandidate(applicationId: string, updateData: Partial<IApplication>): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(applicationId, updateData, { new: true }).exec();
  }

  /**
   * Başvuruyu güncelle. (Genel amaçlı)
   */
  public async updateApplicationById(
    applicationId: string,
    updateData: Partial<IApplication>
  ): Promise<IApplication | null> {
    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      updateData,
      { new: true }
    ).exec();
  }
  
  public async getApplicationByEmailAndInterview(email: string, interviewId: string): Promise<IApplication | null> {
    return ApplicationModel.findOne({
        'candidate.email': email,
        interviewId: new Types.ObjectId(interviewId),
    }).exec();
  }
}