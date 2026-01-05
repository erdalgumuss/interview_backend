// src/modules/video/services/videoResponse.service.ts

import { VideoResponseRepository } from '../repositories/videoResponse.repository';
import { UploadVideoResponseDTO, GetVideoResponsesDTO } from '../dtos/videoResponse.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import { Types } from 'mongoose';

// ✅ AWS SDK Imports
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class VideoResponseService {
    private videoResponseRepository: VideoResponseRepository;
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.videoResponseRepository = new VideoResponseRepository();
        
        // ✅ S3 Client Başlatma (Env değişkenlerinden okur)
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'eu-central-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'interview-videos-bucket';
    }

    /**
     * ✅ YENİ METOT: Frontend için güvenli yükleme URL'i oluşturur.
     * Bu URL ile frontend, videoyu direkt S3'e atar.
     */
    public async getUploadUrl(
        applicationId: string, 
        questionId: string, 
        contentType: string = 'video/webm'
    ): Promise<{ uploadUrl: string; videoKey: string }> { // videoUrl yerine videoKey dönüyoruz
        
        // 1. Validasyonlar
        if (!Types.ObjectId.isValid(applicationId) || !Types.ObjectId.isValid(questionId)) {
            throw new AppError('Invalid ID format', ErrorCodes.BAD_REQUEST, 400);
        }

        // 2. Dosya yolu (Key) oluşturma
        // Örnek: interviews/{appId}/{questionId}_{timestamp}.webm
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'webm';
        const videoKey = `interviews/${applicationId}/questions/${questionId}_${timestamp}.${extension}`;

        // 3. S3 Komutunu Hazırla
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: videoKey,
            ContentType: contentType,
            // Opsiyonel: Metadata ekleyebiliriz
            Metadata: {
                applicationId,
                questionId
            }
        });

        try {
            // 4. İmzalı URL'i üret (15 dakika geçerli)
            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
            
            // Frontend'e hem yükleme linkini hem de oluşacak dosya yolunu (Key) dönüyoruz.
            // Frontend yükleme bitince bu 'videoKey'i (veya tam URL'i) bize 'uploadVideoResponse' ile geri gönderecek.
            return { uploadUrl, videoKey };
        } catch (error) {
            console.error('S3 Presigned URL Error:', error);
            throw new AppError('Could not generate upload URL', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
        }
    }

    /**
     * ✅ Adayın video yükleme işlemini TEYİT ETMESİ (Metadata Kaydı)
     * Not: Frontend önce getUploadUrl alır, yükler, sonra buraya gelir.
     */
    public async uploadVideoResponse(data: UploadVideoResponseDTO) {
        const { applicationId, questionId, videoUrl, duration } = data;

        // 🔍 Validasyonlar
        if (!Types.ObjectId.isValid(applicationId)) {
            throw new AppError('Invalid application ID', ErrorCodes.BAD_REQUEST, 400);
        }
        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        if (!Types.ObjectId.isValid(questionId)) {
            throw new AppError('Invalid question ID', ErrorCodes.BAD_REQUEST, 400);
        }
        // Interview kontrolü...
        const interview = await InterviewModel.findById(application.interviewId);
        if (!interview || !interview.questions.some(q => q && q._id && q._id.equals(questionId))) {
            throw new AppError('Invalid question ID for this interview', ErrorCodes.BAD_REQUEST, 400);
        }

        // 🔍 URL Kontrolü: Artık kendi S3 bucket linkimiz mi diye kontrol edebiliriz
        // (Eğer videoUrl tam link ise)
        /* if (!videoUrl.includes(this.bucketName)) {
             throw new AppError('Invalid video source', ErrorCodes.BAD_REQUEST, 400);
        } 
        */

        if (duration <= 0) {
            throw new AppError('Invalid video duration', ErrorCodes.BAD_REQUEST, 400);
        }

        // 🔄 Mükerrer Kontrol
        const alreadyUploaded = await this.videoResponseRepository.getVideoResponseByQuestion(applicationId, questionId);
        if (alreadyUploaded) {
            throw new AppError('Video response for this question already exists', ErrorCodes.CONFLICT, 409);
        }

        // 🔄 Kaydet
        const savedVideoResponse = await this.videoResponseRepository.saveVideoResponse({
            ...data,
            uploadedByCandidate: true,
            status: 'pending',
        });

        // 🎯 Tamamlanma Kontrolü
        const totalQuestions = interview.questions.length;
        const uploadedVideos = await this.videoResponseRepository.getVideoResponsesByApplication({ applicationId });

        if (uploadedVideos.length >= totalQuestions) {
            application.status = 'awaiting_ai_analysis'; // Status güncellendi
            await application.save();
        }

        return savedVideoResponse;
    }

    /**
     * ✅ Adayın yüklediği tüm video yanıtlarını getir
     */
    public async getVideoResponses(data: GetVideoResponsesDTO) {
        const { applicationId } = data;

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