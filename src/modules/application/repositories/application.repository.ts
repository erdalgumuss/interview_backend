// src/modules/application/repositories/application.repository.ts

import { Types } from 'mongoose';
import ApplicationModel, { IApplication } from '../models/application.model';

export class ApplicationRepository {
 
  /**
   * ID'ye göre başvuru getir (detay).
   */
  public async getApplicationById(applicationId: string): Promise<IApplication | null> {
    // Populate örneği: Mülakat ve AI analizlerini çek
    return ApplicationModel
      .findById(applicationId)
      .populate('interviewId', 'title status expirationDate') 
      .populate('aiAnalysisResults')
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

  // /**
  //  * Belirli bir soruya (questionId) ait video cevabını ekle veya güncelle.
  //  */
  // public async addOrUpdateVideoResponse(
  //   applicationId: string,
  //   questionId: string,
  //   videoData: {
  //     videoUrl: string;
  //     textAnswer?: string;
  //     aiAnalysisId?: Types.ObjectId;
  //   }
  // ): Promise<IApplication | null> {
  //   // Bir approach: 'responses.questionId' eşleşirse güncelle, yoksa ekle
  //   return ApplicationModel.findOneAndUpdate(
  //     {
  //       _id: applicationId,
  //       'responses.questionId': new Types.ObjectId(questionId),
  //     },
  //     {
  //       $set: {
  //         'responses.$.videoUrl': videoData.videoUrl,
  //         'responses.$.textAnswer': videoData.textAnswer,
  //         'responses.$.aiAnalysisId': videoData.aiAnalysisId,
  //       },
  //     },
  //     {
  //       new: true,
  //       // Bu dokümanda questionId yoksa ekle (upsert benzeri bir yaklaşım)
  //       // upsert: true // Dikkat: İstenmeyen durumlara yol açabilir
  //     }
  //   ).exec();
  // }

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
      { status: 'canceled' }, // veya { deletedAt: new Date() }
      { new: true }
    ).exec();
  }
}
