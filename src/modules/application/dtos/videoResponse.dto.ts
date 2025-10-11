// src/modules/application/dtos/videoResponse.dto.ts

import Joi from 'joi';

export interface VideoResponseDTO {
    applicationId: string;
    questionId: string;
    videoUrl: string;
    duration: number;
    textAnswer?: string;
    aiAnalysisRequired?: boolean;  // AI analizi gerekli mi?
}

/**
 * Video Yanıtı Joi Şeması
 */
export const videoResponseSchema = Joi.object<VideoResponseDTO>({
    applicationId: Joi.string()
        .required()
        .messages({
            'any.required': 'Başvuru ID zorunludur.',
        }),

    questionId: Joi.string()
        .required()
        .messages({
            'any.required': 'Soru ID zorunludur.',
        }),

    videoUrl: Joi.string()
        .uri() // URL formatında olmalı
        .required()
        .messages({
            'any.required': 'Video URL zorunludur.',
            'string.uri': 'Video URL geçerli bir formatta olmalıdır (örn. S3 URL).',
        }),

    duration: Joi.number()
        .min(1) // 0 saniyeden uzun olmalı
        .required()
        .messages({
            'any.required': 'Video süresi zorunludur.',
            'number.min': 'Video süresi en az 1 saniye olmalıdır.',
        }),

    textAnswer: Joi.string()
        .max(5000) // Transkripsiyon veya metin yanıtı için makul bir sınır
        .optional(),
        
    aiAnalysisRequired: Joi.boolean()
        .default(true) // Varsayılan olarak AI analizi zorunlu olabilir
        .optional(),
});