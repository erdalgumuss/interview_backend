// src/modules/application/dtos/publicInterview.dto.ts

import Joi from "joi";

export const getPublicInterviewSchema = Joi.object({
  interviewId: Joi.string().required(), // Basit bir zorunlu alan, istersen ObjectId regex eklenebilir
});

export interface GetPublicInterviewDTO {
  interviewId: string;
  title: string;
  createdAt: Date; // ✅ Yeni eklendi
  expirationDate: Date;
  status: string;
  personalityTest?: {
    // ✅ Yeni ekleme
    id: string;
    required: true;
  } | null;
  stages: {
    personalityTest: boolean;
    questionnaire: boolean;
  };
  questions: {
    _id: string; // ✅ Frontend için gerekli
    questionText: string;
    order: number;
    duration: number;
  }[];
}
