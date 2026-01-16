import Joi from 'joi';
/**
 * Mülakat oluşturma için DTO şeması
 */export const createInterviewSchema = Joi.object({
    title: Joi.string().required().min(5).max(100),
    description: Joi.string().optional().allow('').allow(null),

    expirationDate: Joi.alternatives([
      Joi.date().iso(),
      Joi.number().integer().min(1000000000000) // Timestamp desteği
    ]).required().messages({
      'date.base': 'Expiration date must be a valid ISO date or timestamp.',
      'any.required': 'Expiration date is required.'
    }),

    //Posizyon bilgileri
    position: Joi.object({
        title: Joi.string().required().min(2).max(100),
        department: Joi.string().optional().allow('').allow(null),
        competencyWeights: Joi.object({
            technical: Joi.number().min(0).max(100).optional(),
            communication: Joi.number().min(0).max(100).optional(),
            problem_solving: Joi.number().min(0).max(100).optional(),
        }).optional(),
        description: Joi.string().optional().allow('').allow(null),
    }).optional(),

    personalityTestId: Joi.string().optional().allow('').allow(null, ''),

    stages: Joi.object({
        personalityTest: Joi.boolean().optional().default(false),
        questionnaire: Joi.boolean().optional().default(true),
    }).optional().default({ personalityTest: false, questionnaire: true }),

    aiAnalysisSettings: Joi.object({
        useAutomaticScoring: Joi.boolean().optional().default(true),
        gestureAnalysis: Joi.boolean().optional().default(true),
        speechAnalysis: Joi.boolean().optional().default(true),
        eyeContactAnalysis: Joi.boolean().optional().default(false),
        tonalAnalysis: Joi.boolean().optional().default(false),
        keywordMatchScore: Joi.number().min(0).optional().default(0),
    }).optional().default({}),
        

    questions: Joi.array().items(
            Joi.object({
                questionText: Joi.string().required(),
                expectedAnswer: Joi.string().required(),
                explanation: Joi.string().optional().allow('').allow(null),
                keywords: Joi.array().items(Joi.string()).required(),
                order: Joi.number().required(),
                duration: Joi.number().required(),
                aiMetadata: Joi.object({
                    complexityLevel: Joi.string()
                        .valid('low', 'medium', 'high', 'intermediate', 'advanced')
                        .required(),
                    requiredSkills: Joi.array().items(Joi.string()).required(),
                }).required(),
            })
        ).optional().default([]),
});


/**
 * DTO Tipi (TypeScript için)
 */
/**
 * DTO Tipi (TypeScript için)
 */
export interface CreateInterviewDTO {
    title: string;
    description?: string;
    expirationDate: Date;
    position?: {
        title: string;
        department?: string;
        competencyWeights?: {
            technical?: number;
            communication?: number;
            problem_solving?: number;
        };
        description?: string;
    };
    personalityTestId?: string;
    stages: {
        personalityTest: boolean;
        questionnaire: boolean;
    };
    // ✅ EKLENDİ: Type Tanımı
    aiAnalysisSettings?: {
        useAutomaticScoring: boolean;
        gestureAnalysis: boolean;
        speechAnalysis: boolean;
        eyeContactAnalysis: boolean;
        tonalAnalysis: boolean;
        keywordMatchScore: number;
    };
    questions: {
        questionText: string;
        expectedAnswer: string;
        explanation?: string;
        keywords: string[];
        order: number;
        duration: number;
        aiMetadata: {
            complexityLevel: 'low' | 'medium' | 'high' | 'intermediate' | 'advanced';
            requiredSkills: string[];
        };
    }[];
}