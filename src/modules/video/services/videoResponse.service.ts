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
     * ✅ GÜNCELLENDİ: 'q-0' formatını destekleyen Upload URL Üretici
     */
    public async getUploadUrl(
        applicationId: string, 
        questionId: string, 
        contentType: string = 'video/webm'
    ): Promise<{ uploadUrl: string; videoKey: string; questionId: string }> {
        
        // 1. Validasyon: Sadece Application ID'yi katı kontrol et
        if (!Types.ObjectId.isValid(applicationId)) {
            throw new AppError('Invalid application ID format', ErrorCodes.BAD_REQUEST, 400);
        }

        let finalQuestionId = questionId;

        // 2. Question ID Kontrolü ve Fallback Mekanizması
        if (!Types.ObjectId.isValid(questionId)) {
            // Eğer ID 'q-0' formatındaysa çözümle
            if (questionId.startsWith('q-')) {
                const questionIndex = parseInt(questionId.split('-')[1]);

                // Başvuruyu bul
                const application = await ApplicationModel.findById(applicationId);
                if (!application) throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);

                // Mülakatı bul
                const interview = await InterviewModel.findById(application.interviewId);
                if (!interview) throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);

                // İlgili indexteki soruyu al
                const question = interview.questions[questionIndex];

                if (question && question._id) {
                    finalQuestionId = question._id.toString(); // Gerçek ID'yi bulduk
                } else {
                    // Veritabanında bile ID yoksa geçici ID üret (Patlamaması için)
                    console.warn(`⚠️ Soru index ${questionIndex} için ID bulunamadı, geçici ID üretiliyor.`);
                    finalQuestionId = new Types.ObjectId().toString();
                }
            } else {
                throw new AppError('Invalid Question ID format', ErrorCodes.BAD_REQUEST, 400);
            }
        }

        // 3. Dosya yolu (Key) oluşturma
        // interviews/{appId}/questions/{REAL_ID}_{timestamp}.webm
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'webm';
        const videoKey = `interviews/${applicationId}/questions/${finalQuestionId}_${timestamp}.${extension}`;

        // 4. S3 Komutunu Hazırla
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: videoKey,
            ContentType: contentType,
            Metadata: {
                applicationId,
                questionId: finalQuestionId // Metadata'ya da gerçek ID'yi yazıyoruz
            }
        });

        try {
            // 5. İmzalı URL'i üret
            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
            
            return { 
                uploadUrl, 
                videoKey,
                questionId: finalQuestionId // Frontend'e gerçek ID'yi geri dönüyoruz ki update edebilsin
            };
        } catch (error) {
            console.error('S3 Presigned URL Error:', error);
            throw new AppError('Could not generate upload URL', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
        }
    }

    /**
     * Adayın video yükleme işlemini TEYİT ETMESİ
     */
    public async uploadVideoResponse(data: UploadVideoResponseDTO) {
        // Not: Burada da q-0 gelebilir, benzer logic buraya da eklenebilir 
        // veya frontend getUploadUrl'den dönen 'questionId'yi kullanmalı.
        // Şimdilik buradaki validasyonu esnetmiyoruz, frontend düzgün ID ile gelmeli.
        
        const { applicationId, questionId, videoUrl, duration } = data;

        if (!Types.ObjectId.isValid(applicationId)) {
            throw new AppError('Invalid application ID', ErrorCodes.BAD_REQUEST, 400);
        }
        
        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        // Eğer buraya da q-0 geliyorsa hata vermemesi için basit bir kontrol:
        if (!Types.ObjectId.isValid(questionId)) {
             throw new AppError('Invalid question ID format during submission', ErrorCodes.BAD_REQUEST, 400);
        }

        // Interview kontrolü...
        const interview = await InterviewModel.findById(application.interviewId);
        // questionId artık gerçek ID olmalı
        if (!interview || !interview.questions.some(q => q && q._id && q._id.toString() === questionId)) {
            // Bu kontrolü biraz esnetebiliriz (String karşılaştırma)
            throw new AppError('Invalid question ID for this interview', ErrorCodes.BAD_REQUEST, 400);
        }

        if (duration <= 0) {
            throw new AppError('Invalid video duration', ErrorCodes.BAD_REQUEST, 400);
        }

        const alreadyUploaded = await this.videoResponseRepository.getVideoResponseByQuestion(applicationId, questionId);
        if (alreadyUploaded) {
            throw new AppError('Video response for this question already exists', ErrorCodes.CONFLICT, 409);
        }

        const savedVideoResponse = await this.videoResponseRepository.saveVideoResponse({
            ...data,
            uploadedByCandidate: true,
            status: 'pending',
        });

        const totalQuestions = interview.questions.length;
        const uploadedVideos = await this.videoResponseRepository.getVideoResponsesByApplication({ applicationId });

        if (uploadedVideos.length >= totalQuestions) {
            application.status = 'awaiting_ai_analysis'; 
            await application.save();
        }

        return savedVideoResponse;
    }

    public async getVideoResponses(data: GetVideoResponsesDTO) {
        const { applicationId } = data;

        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        return this.videoResponseRepository.getVideoResponsesByApplication(data);
    }

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