// src/modules/interview/services/interview.service.ts

import { InterviewRepository } from '../repositories/interview.repository';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { IInterview, InterviewStatus } from '../models/interview.model';
import mongoose from 'mongoose';

export class InterviewService {
    private interviewRepository: InterviewRepository;

    constructor() {
        this.interviewRepository = new InterviewRepository();
    }

    /**
     * Mülakat oluşturma iş mantığı.
     * Kullanıcı bilgileri genelde oturumdan veya JWT'den gelir.
     */
    public async createInterview(
        data: CreateInterviewDTO,
        userId: string
    ): Promise<IInterview> {
        console.log('📥 Gelen Questions:', data.questions); // Debug için log

        // 📌 Expiration Date formatı dönüşümü
        const parsedExpirationDate = new Date(data.expirationDate);
        if (isNaN(parsedExpirationDate.getTime())) {
            throw new Error('Invalid expiration date format');
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
            questions: data.questions ?? [], // 📌 Questions alanı eklendi
            interviewLink: {
                link: interviewLink,
                expirationDate: parsedExpirationDate,
            },
            status: InterviewStatus.DRAFT // ✅ Enum kullanıldı
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
        return this.interviewRepository.updateInterviewById(interviewId, updateData);
    }

    /**
     * Mülakatı yayına al.
     */
    public async publishInterview(interviewId: string): Promise<IInterview | null> {
        return this.interviewRepository.updateInterviewById(interviewId, {
            status: InterviewStatus.PUBLISHED // ✅ Enum kullanıldı
        });
    }

    /**
     * Mülakatı soft-delete yap.
     */
    public async softDeleteInterview(interviewId: string): Promise<void> {
        await this.interviewRepository.softDeleteInterviewById(interviewId);
    }

    /**
     * Mülakatı tamamen sil.
     */
    public async deleteInterview(interviewId: string): Promise<void> {
        await this.interviewRepository.deleteInterviewById(interviewId);
    }
}
