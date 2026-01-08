// src/modules/application/repositories/public-candidate.repository.ts

import { Types } from 'mongoose';
import InterviewModel, { IInterview } from '../../interview/models/interview.model';
import ApplicationModel, { IApplication } from '../models/application.model';

export class PublicCandidateRepository {

  /**
   * ✅ Public endpoint için mülakat bilgisi getir.
   * Landing Page için sadece gerekli ve güvenli alanları seçer.
   */
  public async getInterviewPublicById(interviewId: string): Promise<IInterview | null> {
    return await InterviewModel.findById(interviewId, {
      _id: 1,
      createdAt: 1,
      title: 1,
      description: 1,        // Landing page açıklaması
      type: 1,               // Mülakat tipi
      expirationDate: 1,
      status: 1,
      personalityTestId: 1,  // Test var mı kontrolü için
      stages: 1,
      'questions._id': 1,
      'questions.questionText': 1,
      'questions.order': 1,
      'questions.duration': 1,
      // 🔒 GİZLİ ALANLAR: keywords, expectedAnswer, evaluationCriteria BURADA YOK.
    }).lean().exec();
  }

  /**
   * Email ve Mülakat ID'sine göre başvuru bul.
   * Duplicate başvuru kontrolü için kullanılır.
   */
  public async getApplicationByEmailAndInterview(email: string, interviewId: string): Promise<IApplication | null> {
    return ApplicationModel.findOne({
        'candidate.email': email,
        interviewId: new Types.ObjectId(interviewId),
    }).exec();
  }

  /**
   * Yeni bir başvuru (Application) oluştur.
   */
  public async createApplication(data: Partial<IApplication>): Promise<IApplication> {
    const application = new ApplicationModel(data);
    return application.save();
  }

  /**
   * OTP doğrulama işlemi için Verification Code dahil başvuru getir.
   * 'select: false' olan alanları (+candidate.verificationCode) dahil eder.
   */
  public async getApplicationByIdWithVerification(
    applicationId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findById(applicationId)
      .select('+candidate.verificationCode')
      .exec();
  }

  /**
   * Adayın başvurusunu ID ile getir.
   */
  public async getApplicationById(applicationId: string): Promise<IApplication | null> {
    return ApplicationModel.findById(applicationId).exec();
  }

  /**
   * ✅ GÜNCELLENDİ: Adayın profil bilgilerini güncelle (Wizard Formu).
   * Service'den gelen application nesnesinden sadece ilgili alanları alır ve günceller.
   * Bu yöntem, tüm dokümanı overwrite etmekten daha güvenlidir.
   */
  public async updateCandidate(applicationId: string, data: Partial<IApplication>): Promise<IApplication | null> {
    const updatePayload: any = {};

    // Sadece adayın değiştirmesine izin verilen alanlar
    if (data.education) updatePayload.education = data.education;
    if (data.experience) updatePayload.experience = data.experience;
    if (data.skills) updatePayload.skills = data.skills;
    if (data.documents) updatePayload.documents = data.documents; // ✅ Documents eklendi
    if (data.status) updatePayload.status = data.status; // Durum güncellemesine izin ver (in_progress)

    return ApplicationModel.findByIdAndUpdate(
      applicationId,
      { $set: updatePayload },
      { new: true }
    ).exec();
  }

  /**
   * Başvuruyu genel amaçlı güncelle (Status, Video Yanıtları vb. için).
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
}