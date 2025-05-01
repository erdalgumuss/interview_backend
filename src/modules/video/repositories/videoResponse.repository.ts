import VideoResponseModel, { IVideoResponse } from '../models/videoResponse.model';
import { UploadVideoResponseDTO, GetVideoResponsesDTO } from '../dtos/videoResponse.dto';
import { Types } from 'mongoose';

export class VideoResponseRepository {
  /**
   * Yeni bir video yanıtı kaydeder.
   */
  public async saveVideoResponse(data: UploadVideoResponseDTO): Promise<IVideoResponse> {
    return VideoResponseModel.create({
      ...data,
      applicationId: new Types.ObjectId(data.applicationId),
      questionId: new Types.ObjectId(data.questionId),
    });
  }

  /**
   * Belirli bir başvuruya ait tüm video yanıtlarını getirir.
   */
  public async getVideoResponsesByApplication(data: GetVideoResponsesDTO): Promise<IVideoResponse[]> {
    return VideoResponseModel.find({
      applicationId: new Types.ObjectId(data.applicationId),
    }).exec();
  }

  /**
   * Belirli bir başvuru + soru eşleşmesi için video yanıtı kontrolü.
   */
  public async getVideoResponseByQuestion(
    applicationId: string,
    questionId: string
  ): Promise<IVideoResponse | null> {
    return VideoResponseModel.findOne({
      applicationId: new Types.ObjectId(applicationId),
      questionId: new Types.ObjectId(questionId),
    }).exec();
  }

  /**
   * Video işlenme durumunu günceller.
   */
  public async updateVideoStatus(
    videoId: string,
    status: 'pending' | 'processed'
  ): Promise<IVideoResponse | null> {
    return VideoResponseModel.findByIdAndUpdate(
      videoId,
      { status },
      { new: true }
    ).exec();
  }
}
