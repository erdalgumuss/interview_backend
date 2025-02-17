
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
    return InterviewModel.findById(interviewId, {
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
  }
  public async getApplicationByIdWithVerification(
    applicationId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findById(applicationId)
      .select('+candidate.verificationCode')
      .exec();
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
}
