// src/modules/application/dtos/publicInterview.dto.ts

import Joi from 'joi';

// 1. Input (Request Params) Validasyonu
export const getPublicInterviewSchema = Joi.object({
  interviewId: Joi.string().required().messages({
    'string.empty': 'Interview ID cannot be empty',
    'any.required': 'Interview ID is required'
  }),
});

// 2. Output (Response) Veri Yapısı
export interface GetPublicInterviewDTO {
    interviewId: string;
    title: string;
    description?: string; // ✅ YENİ: Adayın neye başvurduğunu görmesi için (Eski DTO'dan kurtarıldı)
    type?: string;        // ✅ YENİ: Mülakat formatı (async-video, live vb.)
    
    createdAt: Date;
    expirationDate: Date;
    status: string;
    
    // Test gereklilikleri
    personalityTest?: {
      id: string;
      required: boolean;
    } | null;

    stages: {
      personalityTest: boolean;
      questionnaire: boolean;
    };
    
    // Sorular (Sadece gerekli alanlar)
    questions: {
      questionText: string;
      order: number;
      duration: number;
    }[];
}