import Joi from 'joi';

/**
 * ✅ Adayın video yanıtını yüklemesi için DTO
 */

export const uploadVideoResponseSchema = Joi.object({
    applicationId: Joi.string().required(),
    questionId: Joi.string().required(),
    videoUrl: Joi.string().uri().required(),
    duration: Joi.number().min(1).required(),
    uploadedByCandidate: Joi.boolean().default(true), // ✅ Yeni eklendi
});

/**
 * ✅ DTO Interface (TypeScript)
 */
export interface UploadVideoResponseDTO {
    applicationId: string;
    questionId: string;
    videoUrl: string;
    duration: number;
    uploadedByCandidate?: boolean;    
    status?: 'pending' | 'processed';
}

/**
 * ✅ Adayın video yanıtlarını getirmek için DTO
 */
export const getVideoResponsesSchema = Joi.object({
    applicationId: Joi.string().required(),
});

/**
 * ✅ DTO Interface (TypeScript)
 */
export interface GetVideoResponsesDTO {
    applicationId: string;
}
