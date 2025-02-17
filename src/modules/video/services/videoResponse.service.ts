import { VideoResponseRepository } from '../repositories/videoResponse.repository';
import { UploadVideoResponseDTO, GetVideoResponsesDTO } from '../dtos/videoResponse.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import { Types } from 'mongoose';

export class VideoResponseService {
    private videoResponseRepository: VideoResponseRepository;

    constructor() {
        this.videoResponseRepository = new VideoResponseRepository();
    }

    /**
     * ✅ Adayın video yanıtını yüklemesi
     */
    public async uploadVideoResponse(data: UploadVideoResponseDTO) {
        const { applicationId, questionId, videoUrl, duration } = data;

        // 🔍 Geçerli bir başvuru ID olup olmadığını kontrol et
        if (!Types.ObjectId.isValid(applicationId)) {
            throw new AppError('Invalid application ID', ErrorCodes.BAD_REQUEST, 400);
        }
        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        // 🔍 Geçerli bir soru ID olup olmadığını kontrol et
        if (!Types.ObjectId.isValid(questionId)) {
            throw new AppError('Invalid question ID', ErrorCodes.BAD_REQUEST, 400);
        }
        const interview = await InterviewModel.findById(application.interviewId);
        if (!interview || !interview.questions.some(q => q && q._id && q._id.equals(questionId))) {
            throw new AppError('Invalid question ID', ErrorCodes.BAD_REQUEST, 400);
        }

        // 🔍 Video URL kontrolü (S3 veya desteklenen bir CDN olmalı)
        const s3Regex = /^https?:\/\/([^\/]+\.)?(s3\.amazonaws\.com|cloudfront\.net|cdn\.)\/.+$/;
        if (!s3Regex.test(videoUrl)) {
            throw new AppError('Invalid video URL format', ErrorCodes.BAD_REQUEST, 400);
        }

        // 🔍 Video süresi kontrolü
        if (duration <= 0) {
            throw new AppError('Invalid video duration', ErrorCodes.BAD_REQUEST, 400);
        }

        // 🔄 Adayın aynı soruya daha önce video yükleyip yüklemediğini kontrol et
        const alreadyUploaded = await this.videoResponseRepository.getVideoResponseByQuestion(applicationId, questionId);
        if (alreadyUploaded) {
            throw new AppError('Video response for this question already exists', ErrorCodes.CONFLICT, 409);
        }

        // 🔄 Videoyu kaydet
        const savedVideoResponse = await this.videoResponseRepository.saveVideoResponse({
            ...data,
            uploadedByCandidate: true,
            status: 'pending', // AI analizi için işlenmemiş olarak işaretle
        });

        // 🎯 Aday mülakatı tamamladıysa, başvuru durumunu güncelle
        const totalQuestions = interview.questions.length;
        const uploadedVideos = await this.videoResponseRepository.getVideoResponsesByApplication({ applicationId });

        if (uploadedVideos.length >= totalQuestions) {
            application.status = 'completed';
            await application.save();
        }

        return savedVideoResponse;
    }

    /**
     * ✅ Adayın yüklediği tüm video yanıtlarını getir
     */
    public async getVideoResponses(data: GetVideoResponsesDTO) {
        const { applicationId } = data;

        // 🔍 Başvuru var mı kontrol et
        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        return this.videoResponseRepository.getVideoResponsesByApplication(data);
    }

    /**
     * ✅ AI işlenme durumunu güncelle
     */
    public async updateVideoProcessingStatus(videoId: string, status: 'pending' | 'processed') {
        if (!Types.ObjectId.isValid(videoId)) {
            throw new AppError('Invalid video ID', ErrorCodes.BAD_REQUEST, 400);
        }

        const video = await this.videoResponseRepository.updateVideoStatus(videoId, status);
        if (!video) {
            throw new AppError('Video not found', ErrorCodes.NOT_FOUND, 404);
        }

        return video;
    }
}
