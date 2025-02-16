import { ApplicationRepository } from '../repositories/application.repository';
import { InterviewRepository } from '../../interview/repositories/interview.repository';
import { IApplication } from '../models/application.model';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';

export class ApplicationService {
  private applicationRepository: ApplicationRepository;
  private interviewRepository: InterviewRepository;

  constructor() {
    this.applicationRepository = new ApplicationRepository();
    this.interviewRepository = new InterviewRepository();
  }

  /**
   * Tek bir başvuruyu görüntüleme (Sadece mülakatı oluşturan kullanıcı).
   * userId: Şu an oturum açan kullanıcının id'si (HR)
   */
  public async getApplicationById(applicationId: string, userId: string): Promise<IApplication> {
    // 1) Başvuru var mı?
    const application = await this.applicationRepository.getApplicationById(applicationId);
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) Mülakatı getir
    const interviewId = application.interviewId.toString();
    const interview = await this.interviewRepository.getInterviewById(interviewId);

    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 3) Mülakat sahibi mi kontrol et
    //    interview.createdBy.userId === userId
    if (interview.createdBy.userId.toString() !== userId) {
      throw new AppError(
        'Forbidden: You are not the owner of this interview',
        ErrorCodes.FORBIDDEN,
        403
      );
    }

    return application;
  }
}
