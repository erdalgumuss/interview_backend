
import { Types } from 'mongoose';
import InterviewModel, { IInterview } from '../../interview/models/interview.model';
import ApplicationModel, { IApplication } from '../models/application.model';

export class CandidateRepository {
  getInterviewById(interviewId: string) {
      throw new Error('Method not implemented.');
  }
  // ... diğer metotlar

  /**
   * Public endpoint için mülakat bilgisi getir.
   * Gizli alanları hariç tutmak için projection yapıyoruz.
   */
  public async getInterviewPublicById(interviewId: string): Promise<IInterview | null> {
    const interview = await InterviewModel.findById(interviewId, {
      _id: 1,          // ✅ ID'yi döndürüyoruz
      createdAt: 1,
      title: 1,
      expirationDate: 1,
      status: 1,
      personalityTestId: 1,   // ✅ Kişilik testi ID'si
      stages: 1,             // ✅ stages bilgisi (ör. { personalityTest: false, questionnaire: true })
      'questions.questionText': 1,
      'questions.order': 1,
      'questions.duration': 1,
      // expectedAnswer, keywords vb. alanları EXCLUDE ediyoruz
    }).exec();
    if (!interview || interview.status !== 'active' || (interview.expirationDate && interview.expirationDate < new Date())) {
      return null;  // Mülakat geçersizse null döndür
    }
    return  interview;
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
