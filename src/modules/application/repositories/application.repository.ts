// src/modules/application/repositories/application.repository.ts

import { Types } from 'mongoose';
import ApplicationModel, { IApplication } from '../models/application.model';

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

}
