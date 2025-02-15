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
   */
  public async getInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findById(interviewId).exec();
  }

  /**
   * ID ile mülakatı güncelle.
   */
  public async updateInterviewById(
    interviewId: string,
    updateData: Partial<IInterview>
  ): Promise<IInterview | null> {
    return InterviewModel.findByIdAndUpdate(interviewId, updateData, {
      new: true
    }).exec();
  }


  /**
   * ID ile mülakatı sil (kalıcı).
   */
  public async deleteInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findByIdAndDelete(interviewId).exec();
  }

    /**
     * Kullanıcının oluşturduğu tüm mülakatları getir.
     */
    public async getInterviewsByUser(userId: string): Promise<IInterview[]> {
      return InterviewModel.find({ 'createdBy.userId': userId }).exec();
  }

    /**
     * Tüm mülakatları getir (Sadece Admin Yetkisi ile).
     */
    public async getAllInterviews(): Promise<IInterview[]> {
      return InterviewModel.find().exec();
  }

  
}

  // İhtiyaç oldukça ek CRUD işlemleri (listeleme, filtreleme vb.)

