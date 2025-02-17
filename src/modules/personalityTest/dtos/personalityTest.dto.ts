import Joi from 'joi';
import { Types } from 'mongoose';

/**
 * ✅ Yeni Kişilik Testi Oluşturma DTO
 */
export const createPersonalityTestSchema = Joi.object({
    testName: Joi.string().required().min(3).max(50).messages({
        'any.required': 'Test name is required.',
        'string.min': 'Test name must be at least 3 characters long.',
        'string.max': 'Test name cannot exceed 50 characters.',
    }),
    description: Joi.string().optional().max(500),
    questions: Joi.array()
        .items(
            Joi.object({
                questionText: Joi.string().required(),
                questionType: Joi.string()
                    .valid('multiple_choice', 'rating', 'open_text')
                    .required(),
                choices: Joi.alternatives().conditional('questionType', {
                    is: 'multiple_choice',
                    then: Joi.array().items(Joi.string().required()).min(2),
                    otherwise: Joi.forbidden(),
                }),
                ratingScale: Joi.alternatives().conditional('questionType', {
                    is: 'rating',
                    then: Joi.number().min(1).max(10),
                    otherwise: Joi.forbidden(),
                }),
                personalityTraitsImpact: Joi.object({
                    openness: Joi.number().min(0).max(1).optional(),
                    conscientiousness: Joi.number().min(0).max(1).optional(),
                    extraversion: Joi.number().min(0).max(1).optional(),
                    agreeableness: Joi.number().min(0).max(1).optional(),
                    neuroticism: Joi.number().min(0).max(1).optional(),
                }).optional(),
            })
        )
        .min(1)
        .required(),
});

/**
 * DTO Interface (TypeScript)
 */
export interface CreatePersonalityTestDTO {
    testName: string;
    description?: string;
    questions: {
        questionText: string;
        questionType: 'multiple_choice' | 'rating' | 'open_text';
        choices?: string[];
        ratingScale?: number;
        personalityTraitsImpact?: {
            openness?: number;
            conscientiousness?: number;
            extraversion?: number;
            agreeableness?: number;
            neuroticism?: number;
        };
    }[];
}

/**
 * ✅ Kişilik Testi Güncelleme DTO
 */
export const updatePersonalityTestSchema = Joi.object({
    testId: Joi.string().required(),
    testName: Joi.string().optional().min(3).max(50),
    description: Joi.string().optional().max(500),
    questions: Joi.array()
        .items(
            Joi.object({
                questionText: Joi.string().optional(),
                questionType: Joi.string()
                    .valid('multiple_choice', 'rating', 'open_text')
                    .optional(),
                choices: Joi.alternatives().conditional('questionType', {
                    is: 'multiple_choice',
                    then: Joi.array().items(Joi.string().required()).min(2),
                    otherwise: Joi.forbidden(),
                }),
                ratingScale: Joi.alternatives().conditional('questionType', {
                    is: 'rating',
                    then: Joi.number().min(1).max(10),
                    otherwise: Joi.forbidden(),
                }),
                personalityTraitsImpact: Joi.object({
                    openness: Joi.number().min(0).max(1).optional(),
                    conscientiousness: Joi.number().min(0).max(1).optional(),
                    extraversion: Joi.number().min(0).max(1).optional(),
                    agreeableness: Joi.number().min(0).max(1).optional(),
                    neuroticism: Joi.number().min(0).max(1).optional(),
                }).optional(),
            })
        )
        .min(1)
        .optional(),
});

/**
 * DTO Interface (TypeScript)
 */
export interface UpdatePersonalityTestDTO {
    testId: string;
    testName?: string;
    description?: string;
    questions?: {
        questionText?: string;
        questionType?: 'multiple_choice' | 'rating' | 'open_text';
        choices?: string[];
        ratingScale?: number;
        personalityTraitsImpact?: {
            openness?: number;
            conscientiousness?: number;
            extraversion?: number;
            agreeableness?: number;
            neuroticism?: number;
        };
    }[];
}

/**
 * ✅ Adayın Kişilik Testi Cevaplarını Gönderme DTO
 */
export const submitPersonalityTestSchema = Joi.object({
    applicationId: Joi.string().required(),
    testId: Joi.string().required(),
    responses: Joi.array()
        .items(
            Joi.object({
                questionId: Joi.string().required(),
                answer: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            })
        )
        .min(1)
        .required(),
});

/**
 * DTO Interface (TypeScript)
 */
export interface SubmitPersonalityTestDTO {
    applicationId: string;
    testId: string;
    responses: {
        questionId: string;
        answer: string | number;
    }[];
}
