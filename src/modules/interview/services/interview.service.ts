// src/modules/interview/services/interview.service.ts

import { InterviewRepository } from '../repositories/interview.repository';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { IInterview } from '../models/interview.model';
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
      userId: string,
  ): Promise<IInterview> {
      // 1️⃣ Gelen expirationDate değerini loglayalım
      console.log('Received expirationDate:', data.expirationDate);
  
      // 2️⃣ Expiration Date Format Kontrolü
      const parsedExpirationDate = new Date(data.expirationDate);
      if (isNaN(parsedExpirationDate.getTime())) {
          throw new Error('Invalid expiration date format');
      }
  
      // 3️⃣ Title Eksikse Hata Fırlat
      if (!data.title) {
          throw new Error('Interview title is required.');
      }
  
      // 4️⃣ DTO ile gelen veriyi doğrula
      const interviewData: Partial<IInterview> = {
          title: data.title,
          expirationDate: parsedExpirationDate,
          createdBy: {
              userId: new mongoose.Types.ObjectId(userId),
          },
          personalityTestId: data.personalityTestId ? new mongoose.Types.ObjectId(data.personalityTestId) : undefined,
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
    
  public async updateInterview(
    interviewId: string,
    updateData: Partial<IInterview>
): Promise<IInterview | null> {
    return this.interviewRepository.updateInterviewById(interviewId, updateData);
}

public async deleteInterview(interviewId: string): Promise<void> {
  await this.interviewRepository.deleteInterviewById(interviewId);
}



}
    // İleride update, delete vb. metotlar da buraya eklenir.

