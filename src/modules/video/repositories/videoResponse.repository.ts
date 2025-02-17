import VideoResponseModel, { IVideoResponse } from '../models/videoResponse.model';
import { UploadVideoResponseDTO, GetVideoResponsesDTO } from '../dtos/videoResponse.dto';
import { Types } from 'mongoose';

export class VideoResponseRepository {
    /**
     * ✅ Adayın video yanıtını kaydet
     */
    public async saveVideoResponse(data: UploadVideoResponseDTO): Promise<IVideoResponse> {
        return VideoResponseModel.create({
            ...data,
            applicationId: new Types.ObjectId(data.applicationId),
            questionId: new Types.ObjectId(data.questionId),
        });
    }

    /**
     * ✅ Adayın belirli bir başvuru için yüklediği tüm videoları getir
     */
    public async getVideoResponsesByApplication(data: GetVideoResponsesDTO): Promise<IVideoResponse[]> {
        return VideoResponseModel.find({ applicationId: new Types.ObjectId(data.applicationId) }).exec();
    }

    /**
     * ✅ Belirli bir soru için daha önce video yanıtı yüklenmiş mi kontrol et
     */
    public async getVideoResponseByQuestion(applicationId: string, questionId: string): Promise<IVideoResponse | null> {
        return VideoResponseModel.findOne({
            applicationId: new Types.ObjectId(applicationId),
            questionId: new Types.ObjectId(questionId),
        }).exec();
    }

    /**
     * ✅ Video işlenme durumunu güncelle
     */
    public async updateVideoStatus(videoId: string, status: 'pending' | 'processed'): Promise<IVideoResponse | null> {
        return VideoResponseModel.findByIdAndUpdate(videoId, { status }, { new: true }).exec();
    }
}
