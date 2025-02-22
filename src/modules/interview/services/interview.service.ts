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
      userId: string
  ): Promise<IInterview> {
      console.log('📥 Gelen Service:', data); // Debug için log
  
      const parsedExpirationDate = new Date(data.expirationDate);
      if (isNaN(parsedExpirationDate.getTime())) {
          throw new Error('Invalid expiration date format');
      }
  
      const interviewData: Partial<IInterview> = {
        title: data.title,
        expirationDate: parsedExpirationDate,
        status: data.status,
        createdBy: {
            userId: new mongoose.Types.ObjectId(userId),
        },
        personalityTestId: data.personalityTestId ? new mongoose.Types.ObjectId(data.personalityTestId) : undefined,
        questions: data.questions ?? [], // 📌 Questions alanı eklendi
        interviewLink: data.interviewLink
            ? {
                  link: data.interviewLink.link,
                  expirationDate: data.interviewLink.expirationDate ? new Date(data.interviewLink.expirationDate) : undefined,
              }
            : undefined,
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

