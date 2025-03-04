import Joi from 'joi';

export interface VideoResponseDTO {
    applicationId: string;
    questionId: string;
    videoUrl: string;
    duration: number;
    textAnswer?: string;
    aiAnalysisRequired?: boolean;  // ✅ AI analizi gerekli mi?
}
