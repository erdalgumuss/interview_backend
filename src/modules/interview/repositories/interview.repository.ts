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
    return InterviewModel.findOne({ _id: interviewId, deletedAt: null }) // ❗Silinmiş mülakatlar hariç
      .populate('createdBy.userId', 'email firstName lastName')
      .populate('personalityTestId', 'title')
      .exec();
  }

  /**
   * Kullanıcının oluşturduğu tüm mülakatları getir (silinmemişler).
   */
  public async getInterviewsByUser(userId: string): Promise<IInterview[]> {
    return InterviewModel.find({ 'createdBy.userId': userId, deletedAt: null }).exec();
  }

  /**
   * Tüm mülakatları getir (Admin yetkisiyle, silinmemişler).
   */
  public async getAllInterviews(): Promise<IInterview[]> {
    return InterviewModel.find({ deletedAt: null }).exec();
  }

  /**
   * ID ile mülakatı güncelle.
   */
  public async updateInterviewById(
    interviewId: string,
    updateData: Partial<IInterview>
  ): Promise<IInterview | null> {
    return InterviewModel.findOneAndUpdate(
      { _id: interviewId, deletedAt: null }, // ❗Silinmemiş mülakatları güncelle
      updateData,
      { new: true }
    ).exec();
  }

  /**
   * Mülakatı soft-delete yöntemiyle sil.
   */
  public async softDeleteInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findOneAndUpdate(
      { _id: interviewId, deletedAt: null }, // ❗Silinmemiş olanı sil
      { deletedAt: new Date() },
      { new: true }
    ).exec();
  }

  /**
   * Mülakatı tamamen sil.
   */
  public async deleteInterviewById(interviewId: string): Promise<IInterview | null> {
    return InterviewModel.findByIdAndDelete(interviewId).exec();
  }

  /**
   * Mülakat için link üretme (uuid + base64 URL)
   */
  public async generateInterviewLink(interviewId: string): Promise<string> {
    const baseUrl = process.env.FRONTEND_BASE_URL || "https://yourfrontend.com/interview";
    const encodedId = Buffer.from(interviewId).toString('base64url'); // URL güvenliği için
    return `${baseUrl}/${encodedId}`;
  }

  /**
   * ID ile mülakat linkini al.
   */
  public async getInterviewLink(interviewId: string): Promise<string | null> {
    const interview = await InterviewModel.findOne({ _id: interviewId, deletedAt: null });
    return interview?.interviewLink?.link || null;
  }
}
