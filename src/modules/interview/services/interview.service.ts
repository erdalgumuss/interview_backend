// src/modules/interview/services/interview.service.ts

import { InterviewRepository } from '../repositories/interview.repository';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { IInterview, InterviewStatus } from '../models/interview.model';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { 
    DashboardDataDTO, 
    ApplicationTrendDTO, 
    DepartmentApplicationDTO, 
    CandidateProfileDTO, 
    FavoriteCandidateDTO, 
    InterviewSummaryDTO
} from '../dtos/dashboardData.dto';

// Diğer modüllerin repository'leri
import { ApplicationRepository } from '../../application/repositories/application.repository'; 
// Candidate modülünün yolu dosya ağacına göre güncellendi
import { CandidateRepository } from '../../candidates/repositories/candidate.repository'; 

export class InterviewService {
    private interviewRepository: InterviewRepository;
    private applicationRepository: ApplicationRepository;
    private candidateRepository: CandidateRepository;

    constructor() {
        this.interviewRepository = new InterviewRepository();
        this.applicationRepository = new ApplicationRepository();
        this.candidateRepository = new CandidateRepository();
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

        const interviewId = new mongoose.Types.ObjectId();

        const interviewData: Partial<IInterview> = {
            _id: interviewId,
            title: data.title,
            description: data.description,
            expirationDate: parsedExpirationDate,
            createdBy: {
                userId: new mongoose.Types.ObjectId(userId),
            },
            type: data.type as any,
            position: data.position, // ✅ DTO'dan gelen pozisyon verisi
            aiAnalysisSettings: data.aiAnalysisSettings, // ✅ DTO'dan gelen AI ayarları
            personalityTestId: data.personalityTestId
                ? new mongoose.Types.ObjectId(data.personalityTestId)
                : undefined,
            stages: data.stages,
            questions: data.questions as any,
            status: InterviewStatus.DRAFT // İlk durum her zaman DRAFT'tır.
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
     * Mülakat güncelleme.
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
        // Mülakat yayındaysa kritik alanların değişmesini engelliyoruz.
        if (interview.status === InterviewStatus.PUBLISHED) {
            const forbiddenFields = [
                'questions', 
                'title', 
                'personalityTestId', 
                'position',           // ✅ Pozisyon (puanlama ağırlıkları) değişemez
                'aiAnalysisSettings'  // ✅ AI ayarları değişemez
            ];
            const attemptedUpdates = Object.keys(updateData);
            
            // Status değişimi hariç diğer alanları kontrol et
            if (attemptedUpdates.some(field => forbiddenFields.includes(field) && field !== 'status')) {
                 throw new AppError(
                     'Cannot modify core fields (questions, title, position, AI settings) of a PUBLISHED interview.', 
                     ErrorCodes.BAD_REQUEST, 
                     400
                 );
            }
        }
        
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
     */
    public async publishInterview(interviewId: string): Promise<IInterview | null> {
        const interview = await this.interviewRepository.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found.', ErrorCodes.NOT_FOUND, 404);
        }

        if (interview.status !== InterviewStatus.DRAFT) {
            throw new AppError(
                `Cannot publish an interview with status: ${interview.status}`, 
                ErrorCodes.CONFLICT, 
                409
            ); 
        }
        
        if (!interview.questions || interview.questions.length === 0) {
             throw new AppError('Interview must have questions before publishing.', ErrorCodes.BAD_REQUEST, 400);
        }

        if (interview.expirationDate && new Date() > interview.expirationDate) {
             throw new AppError('Cannot publish an interview that has already expired.', ErrorCodes.FORBIDDEN, 403);
        }
        
        // ✅ YENİ MANTIK: Link üretimi Repository'den Service'e taşındı.
        const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        // URL-safe base64 encoding
        const encodedId = Buffer.from(interviewId.toString()).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
        const interviewLink = `${baseUrl}/applications/${encodedId}`; // Frontend rotasına uygun link

        const updatedInterview = await this.interviewRepository.updateInterviewById(interviewId, {
            status: InterviewStatus.PUBLISHED,
            interviewLink: {
                link: interviewLink,
                expirationDate: interview.expirationDate, 
            }
        });

        return updatedInterview;
    }

   public async softDeleteInterview(interviewId: string): Promise<void> {
        await this.interviewRepository.softDeleteInterviewById(interviewId);
    }

    public async deleteInterview(interviewId: string): Promise<void> {
        await this.interviewRepository.deleteInterviewById(interviewId);
    }

    /**
     * Dashboard verilerini getirir.
     * Mock veriler yerine Repository'ler üzerinden gerçek veriyi işlemeye çalışır.
     */
    public async getDashboardData(userId: string): Promise<DashboardDataDTO> {
        // 1. Kullanıcının Mülakatlarını Çek
        const userInterviews = await this.interviewRepository.getInterviewsByUser(userId);
        const interviewIds = userInterviews.map(i => i._id);
        
        const totalInterviews = userInterviews.length;
        const publishedCount = userInterviews.filter(i => i.status === InterviewStatus.PUBLISHED).length;

        // 2. Başvuruları Çek (ApplicationRepository kullanımı)
        // Not: ApplicationRepository'de bu metot yoksa eklenmelidir: find(query) veya getByInterviewIds
        // Şimdilik any kullanarak bypass ediyoruz, ApplicationRepository güncellendiğinde type-safe olacak.
        let allApplications: any[] = [];
        try {
            // Eğer ApplicationRepository'de find metodu varsa:
            if ((this.applicationRepository as any).find) {
                allApplications = await (this.applicationRepository as any).find({ 
                    interviewId: { $in: interviewIds } 
                });
            } else {
                // Metot yoksa boş dizi (Hata patlamaması için)
                console.warn('ApplicationRepository.find method missing for Dashboard data');
            }
        } catch (error) {
            console.error('Error fetching applications for dashboard:', error);
        }

        // 3. Adayları Çek (CandidateRepository kullanımı)
        let allCandidates: any[] = [];
        try {
            if ((this.candidateRepository as any).find) {
                 // Başvurusu olan adayları çekmek daha doğru olurdu ama şimdilik genel çekiyoruz
                 allCandidates = await (this.candidateRepository as any).find({}); 
            }
        } catch (error) {
             console.error('Error fetching candidates for dashboard:', error);
        }

        // --- VERİ İŞLEME (AGGREGATION) ---
        // MongoDB Aggregation Pipeline kullanmak daha performanslıdır ama Service katmanında JS ile yapıyoruz.

        // A. Başvuru Trendleri (Tarihe göre grupla)
        const trendMap = new Map<string, number>();
        allApplications.forEach((app: any) => {
            const date = new Date(app.createdAt).toISOString().split('T')[0];
            trendMap.set(date, (trendMap.get(date) || 0) + 1);
        });
        const applicationTrends: ApplicationTrendDTO[] = Array.from(trendMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-7); // Son 7 gün

        // B. Departman Dağılımı (Mülakatlardaki pozisyon verisinden)
        const deptMap = new Map<string, number>();
        // Sadece başvurusu olan mülakatları saymak daha doğru, burada mülakatların kendi departmanlarını sayıyoruz
        userInterviews.forEach(interview => {
            if (interview.position?.department) {
                const dept = interview.position.department;
                deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
            }
        });
        const departmentApplications: DepartmentApplicationDTO[] = Array.from(deptMap.entries())
            .map(([department, count]) => ({ department, count }));

        // C. Favori Adaylar (Skoru yüksek olanlar)
        // Not: Aday modeli ve puanlama yapısı Candidate modülüne göre değişebilir.
        const favoriteCandidates: FavoriteCandidateDTO[] = allCandidates
            .filter((c: any) => c.averageScore && c.averageScore > 80) // Örnek filtre
            .map((c: any) => ({
                id: c._id.toString(),
                name: `${c.firstName} ${c.lastName}`,
                position: c.currentPosition || 'Candidate', // Uygun alan seçilmeli
                score: c.averageScore || 0
            }))
            .slice(0, 5);

        // D. Aday Profilleri (Deneyime göre)
        const expMap = new Map<string, number>();
        allCandidates.forEach((c: any) => {
            const exp = c.experienceLevel || 'Unknown';
            expMap.set(exp, (expMap.get(exp) || 0) + 1);
        });
        const candidateProfiles: CandidateProfileDTO[] = Array.from(expMap.entries())
            .map(([experience, count]) => ({ experience, count }));

        return {
            applicationTrends,
            departmentApplications,
            candidateProfiles,
            favoriteCandidates,
            interviewSummary: { totalInterviews, publishedCount }
        };
    }
}