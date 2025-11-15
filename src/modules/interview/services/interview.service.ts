// src/modules/interview/services/interview.service.ts

import { InterviewRepository } from '../repositories/interview.repository';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { IInterview, InterviewStatus } from '../models/interview.model';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errors/appError'; // AppError import edildi
import { ErrorCodes } from '../../../constants/errors'; // ErrorCodes import edildi
import { 
    DashboardDataDTO, 
    ApplicationTrendDTO, 
    DepartmentApplicationDTO, 
    CandidateProfileDTO, 
    FavoriteCandidateDTO, 
    InterviewSummaryDTO
} from '../dtos/dashboardData.dto';
import {ApplicationRepository} from '../../application/repositories/application.repository'; 
 import {VideoResponseRepository} from '../../video/repositories/videoResponse.repository';

export class InterviewService {
    private interviewRepository: InterviewRepository;
    private applicationRepository: ApplicationRepository; // Eğer varsa
    private videoResponseRepository: VideoResponseRepository;

    constructor() {
        this.interviewRepository = new InterviewRepository();
        this.applicationRepository = new ApplicationRepository();
        this.videoResponseRepository = new VideoResponseRepository();
    }

    /**
     * Mülakat oluşturma iş mantığı.
     */
    public async createInterview(
        data: CreateInterviewDTO,
        userId: string
    ): Promise<IInterview> {
        // 🚨 İş Kuralı 1: Soru Seti Zorunlu Kontrolü
        if (!data.questions || data.questions.length === 0) {
            throw new AppError(
                'Interview must contain at least one question.', 
                ErrorCodes.BAD_REQUEST, 
                400
            );
        }

        // 📌 Expiration Date formatı dönüşümü
        const parsedExpirationDate = new Date(data.expirationDate);
        if (isNaN(parsedExpirationDate.getTime())) {
            throw new AppError(
                'Invalid expiration date format', 
                ErrorCodes.BAD_REQUEST, 
                400
            );
        }

          // ✅ DÜZELTME: Link oluşturma mantığı kaldırıldı.
        const interviewId = new mongoose.Types.ObjectId();

        const interviewData: Partial<IInterview> = {
            _id: interviewId,
            title: data.title,
            expirationDate: parsedExpirationDate,
            createdBy: {
                userId: new mongoose.Types.ObjectId(userId),
            },
            personalityTestId: data.personalityTestId
                ? new mongoose.Types.ObjectId(data.personalityTestId)
                : undefined,
            questions: data.questions,
            // ❌ KALDIRILDI: Link bilgisi (interviewLink) ilk oluşturmada boş bırakılır.
            status: InterviewStatus.DRAFT // ✅ ZORUNLU KILINDI: İlk durum her zaman DRAFT'tır.
        };

        return this.interviewRepository.createInterview(interviewData);
    }

    /**
     * ID ile tek mülakat bilgisi.
     */
    public async getInterviewById(interviewId: string): Promise<IInterview | null> {
        return this.interviewRepository.getInterviewById(interviewId);
    }

    /**
     * Tüm mülakatları getir (Admin için).
     */
    public async getAllInterviews(): Promise<IInterview[]> {
        return this.interviewRepository.getAllInterviews();
    }

    /**
     * Kullanıcının oluşturduğu mülakatları getir.
     */
    public async getInterviewsByUser(userId: string): Promise<IInterview[]> {
        return this.interviewRepository.getInterviewsByUser(userId);
    }

    /**
     * Mülakat güncelleme. (Soru ve Kişilik Testi güncellemeleri de dahil)
     */
    public async updateInterview(
        interviewId: string,
        updateData: Partial<IInterview>
    ): Promise<IInterview | null> {
        const interview = await this.interviewRepository.getInterviewById(interviewId);
        
        if (!interview) {
            throw new AppError('Interview not found.', ErrorCodes.NOT_FOUND, 404);
        }

        // 🚨 İş Kuralı 2: Yayınlanmış Mülakat Koruması
        if (interview.status === InterviewStatus.PUBLISHED) {
            const forbiddenFields = ['questions', 'title', 'personalityTestId'];
            const attemptedUpdates = Object.keys(updateData);
            
            if (attemptedUpdates.some(field => forbiddenFields.includes(field) && field !== 'status')) {
                 throw new AppError(
                     'Cannot modify core fields (questions, title, test) of a PUBLISHED interview. Change its status first.', 
                     ErrorCodes.BAD_REQUEST, 
                     400
                 );
            }
        }
        
        // Eğer sorular güncelleniyorsa, boş olup olmadığını kontrol et
        if (updateData.questions && updateData.questions.length === 0) {
             throw new AppError(
                 'Interview must contain at least one question.', 
                 ErrorCodes.BAD_REQUEST, 
                 400
             );
        }

        return this.interviewRepository.updateInterviewById(interviewId, updateData);
    }

     /**
     * Mülakatı yayına al.
     * Bu metot, durumu PUBLISHED yapar ve mülakat linkini oluşturur.
     */
    public async publishInterview(interviewId: string): Promise<IInterview | null> {
        const interview = await this.interviewRepository.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found.', ErrorCodes.NOT_FOUND, 404);
        }

        // 🚨 İş Kuralı 3: Yayınlama Öncesi Kontroller
        if (interview.status !== InterviewStatus.DRAFT) {
            throw new AppError(
                `Cannot publish an interview with status: ${interview.status}`, 
                ErrorCodes.CONFLICT, 
                409
            ); 
        }
        
        if (!interview.questions || interview.questions.length === 0) {
             throw new AppError(
                 'Interview must have questions before publishing.', 
                 ErrorCodes.BAD_REQUEST, 
                 400
             );
        }

        if (interview.expirationDate && new Date() > interview.expirationDate) {
             throw new AppError(
                 'Cannot publish an interview that has already expired.', 
                 ErrorCodes.FORBIDDEN, 
                 403
             );
        }
        
        // ✅ YENİ MANTIK: Mülakat linkini oluştur
        const interviewLink = await this.interviewRepository.generateInterviewLink(
            interviewId
        );

        // ✅ YENİ MANTIK: Link bilgisini ve status'u kaydet
        const updatedInterview = await this.interviewRepository.updateInterviewById(interviewId, {
            status: InterviewStatus.PUBLISHED,
            interviewLink: {
                link: interviewLink,
                // Linkin bitiş tarihini mülakatın bitiş tarihiyle eşitliyoruz.
                expirationDate: interview.expirationDate, 
            }
        });

        return updatedInterview;
    }
    /**
     * Mülakatı soft-delete yap. (Controller'dan sahiplik kontrolü gelecektir)
     */
   public async softDeleteInterview(interviewId: string): Promise<void> {
        // Kontrolsüz silme işlemi
        await this.interviewRepository.softDeleteInterviewById(interviewId);
    }


    /**
     * Mülakatı tamamen sil. (Controller'dan sahiplik kontrolü gelecektir)
     */
    public async deleteInterview(interviewId: string): Promise<void> {
        await this.interviewRepository.deleteInterviewById(interviewId);
    }
    /**
     * Dashboard için toplu istatistik verilerini getirir.
     * Bu metot, Service katmanları arasında koordinasyon sağlar.
     */
    public async getDashboardData(userId: string): Promise<DashboardDataDTO> {
        // Bu, farklı Repository çağrılarını koordine eden ana işlevdir.

        // 1. Mülakat İstatistikleri (InterviewRepository)
        const userInterviews = await this.interviewRepository.getInterviewsByUser(userId);
        const totalInterviews = userInterviews.length;
        const publishedCount = userInterviews.filter(i => i.status === InterviewStatus.PUBLISHED).length;

        // 2. Uygulama/Aday Trendleri (Simüle Edildi - Gerçekte ApplicationRepository'den gelir)
        // Dashboard Frontend'inin beklediği tüm alanları doldurmak zorundayız.
        const applicationTrends: ApplicationTrendDTO[] = [
            { date: '2025-10-01', count: 15 },
            { date: '2025-10-02', count: 22 },
        ];
        
        // 3. Favori Adaylar (Simüle Edildi - Gerçekte CandidateRepository'den gelir)
        const favoriteCandidates: FavoriteCandidateDTO[] = [
            { id: 'c1', name: 'Ayşe Yılmaz', position: 'Developer', score: 92 },
            { id: 'c2', name: 'Can Demir', position: 'Analist', score: 88 },
        ];

        // 4. Diğer Özet Veriler (Simüle Edildi)
        const departmentApplications: DepartmentApplicationDTO[] = [
             { department: 'Yazılım', count: 120 },
             { department: 'IK', count: 45 },
        ];
        
        const candidateProfiles: CandidateProfileDTO[] = [
             { experience: 'Junior', count: 60 },
             { experience: 'Senior', count: 40 },
        ];


        return {
            applicationTrends,
            departmentApplications,
            candidateProfiles,
            favoriteCandidates,
            // Ek olarak mülakat özeti eklenebilir
            interviewSummary: { totalInterviews, publishedCount } as InterviewSummaryDTO
        };
    }
}
