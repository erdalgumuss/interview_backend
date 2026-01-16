// src/modules/interview/services/interview.service.ts

import { InterviewRepository } from '../repositories/interview.repository';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { IInterview, InterviewStatus } from '../models/interview.model';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errors/appError'; // AppError import edildi
import { ErrorCodes } from '../../../constants/errors'; // ErrorCodes import edildi

export class InterviewService {
    private interviewRepository: InterviewRepository;

    constructor() {
        this.interviewRepository = new InterviewRepository();
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

        // 📌 Interview Link oluşturulması
        const interviewId = new mongoose.Types.ObjectId();
        const interviewLink = await this.interviewRepository.generateInterviewLink(
            interviewId.toString()
        );

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
            interviewLink: {
                link: interviewLink,
                expirationDate: parsedExpirationDate,
            },
            status: InterviewStatus.DRAFT 
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
        
        const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        
        // ❌ İPTAL: Base64 Encoding şimdilik kapalı.
        // Frontend doğrudan ID ile API isteği atacağı için şifreleme karmaşıklık yaratır.
        // İleride 'shortId' veya 'slug' sistemine geçilebilir.
        /*
        const encodedId = Buffer.from(interviewId.toString()).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        */
            
        // ✅ DÜZELTME 1: Rota 'applications' -> 'application' (Frontend klasör adıyla aynı)
        // ✅ DÜZELTME 2: encodedId -> interviewId (Direkt ID kullanıyoruz)
        const interviewLink = `${baseUrl}/application/${interviewId}`; 

        const updatedInterview = await this.interviewRepository.updateInterviewById(interviewId, {
            status: InterviewStatus.PUBLISHED,
            interviewLink: {
                link: interviewLink,
                expirationDate: interview.expirationDate, 
            }
        });

        return updatedInterview;
    }

    /**
     * Mülakatı soft-delete yap. (Controller'dan sahiplik kontrolü gelecektir)
     * Not: Projede soft delete stratejisi kullanılıyor, hard delete yapılmıyor.
     */
    public async deleteInterview(interviewId: string): Promise<void> {
        const interview = await this.interviewRepository.getInterviewById(interviewId);
        
        if (!interview) {
            throw new AppError('Interview not found.', ErrorCodes.NOT_FOUND, 404);
        }

        // Soft delete işlemi
        await this.interviewRepository.softDeleteInterviewById(interviewId);
    }



}
    