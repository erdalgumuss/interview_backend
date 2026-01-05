// src/modules/interview/repositories/interview.repository.ts

import InterviewModel, { IInterview } from '../models/interview.model';

export class InterviewRepository {
  /**
   * Yeni bir mülakat kaydı oluştur.
   */
  public async createInterview(data: Partial<IInterview>): Promise<IInterview> {
    const interview = new InterviewModel(data);
    return interview.save();
  }

  /**
   * ID ile mülakatı getir.
   * Silinmemiş (Soft delete olmamış) kayıtları getirir.
   */
  public async getInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findOne({ _id: interviewId, deletedAt: null }) 
      .populate('createdBy.userId', 'email firstName lastName')
      // Eğer PersonalityTest modeli varsa title'ını getir, yoksa hata vermez null döner
      .populate('personalityTestId', 'title') 
      .exec();
  }

  /**
   * Kullanıcının oluşturduğu tüm mülakatları getir (silinmemişler).
   */
  public async getInterviewsByUser(userId: string): Promise<IInterview[]> {
    return InterviewModel.find({ 'createdBy.userId': userId, deletedAt: null })
      .sort({ createdAt: -1 }) // En yeniden eskiye sıralama (UX için iyi olur)
      .exec();
  }

  /**
   * Tüm mülakatları getir (Admin yetkisiyle, silinmemişler).
   */
  public async getAllInterviews(): Promise<IInterview[]> {
    return InterviewModel.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * ID ile mülakatı güncelle.
   */
  public async updateInterviewById(
    interviewId: string,
    updateData: Partial<IInterview>
  ): Promise<IInterview | null> {
    return InterviewModel.findOneAndUpdate(
      { _id: interviewId, deletedAt: null }, // Sadece silinmemişleri güncelle
      updateData,
      { new: true } // Güncellenmiş veriyi döndür
    ).exec();
  }

  /**
   * Mülakatı soft-delete yöntemiyle sil.
   * Veriyi silmez, sadece deletedAt tarihini atar.
   */
  public async softDeleteInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findOneAndUpdate(
      { _id: interviewId, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    ).exec();
  }

  /**
   * Mülakatı tamamen sil (Hard Delete).
   * Veritabanından fiziksel olarak kaldırır.
   */
  public async deleteInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findByIdAndDelete(interviewId).exec();
  }
}