// src/modules/application/dtos/publicInterview.dto.ts

import Joi from 'joi';

export const getPublicInterviewSchema = Joi.object({
  interviewId: Joi.string().required(), // Basit bir zorunlu alan, istersen ObjectId regex eklenebilir
});

export interface GetPublicInterviewDTO {
    interviewId: string;
    title: string;
    createdAt: Date;   // ✅ Yeni eklendi
    expirationDate: Date;
    status: string;
    personalityTestId?: string;
    stages: {
      personalityTest: boolean;
      questionnaire: boolean;
    };
    questions: {
      questionText: string;
      order: number;
      duration: number;
    }[];
  }
  