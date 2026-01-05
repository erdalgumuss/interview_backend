import Joi from 'joi';

/**
 * Mülakat güncelleme için DTO şeması (PATCH/PUT)
 */
export const updateInterviewSchema = Joi.object({
    title: Joi.string().optional().min(5).max(100),
    description: Joi.string().optional().allow('').allow(null),
    
    expirationDate: Joi.alternatives([
      Joi.date().iso(),
      Joi.number().integer().min(1000000000000) 
    ]).optional().messages({
      'date.base': 'Expiration date must be a valid ISO date or timestamp.'
    }),

    // ✅ EKLENDİ: Tip Güncelleme
    type: Joi.string()
        .valid('async-video', 'live-video', 'audio-only', 'text-based')
        .optional(),

    personalityTestId: Joi.string().optional().allow(null, ''), // Bağlantıyı kesmek için null kabul et

    status: Joi.string()
        .valid('active', 'completed', 'published', 'draft', 'inactive')
        .optional(),
    
    stages: Joi.object({
        personalityTest: Joi.boolean().optional(),
        questionnaire: Joi.boolean().optional(),
    }).optional(),

    // ✅ EKLENDİ: Pozisyon Güncelleme
    position: Joi.object({
        title: Joi.string().optional().min(2).max(100),
        department: Joi.string().optional().allow('').allow(null),
        competencyWeights: Joi.object({
            technical: Joi.number().min(0).max(100).optional(),
            communication: Joi.number().min(0).max(100).optional(),
            problem_solving: Joi.number().min(0).max(100).optional(),
        }).optional(),
        description: Joi.string().optional().allow('').allow(null),
    }).optional(),

    // ✅ EKLENDİ: AI Analiz Ayarları Güncelleme
    aiAnalysisSettings: Joi.object({
        useAutomaticScoring: Joi.boolean().optional(),
        gestureAnalysis: Joi.boolean().optional(),
        speechAnalysis: Joi.boolean().optional(),
        eyeContactAnalysis: Joi.boolean().optional(),
        tonalAnalysis: Joi.boolean().optional(),
        keywordMatchScore: Joi.number().min(0).optional(),
    }).optional(),

    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().required(),
            expectedAnswer: Joi.string().required(),
            explanation: Joi.string().optional().allow('').allow(null),
            keywords: Joi.array().items(Joi.string()).required(),
            order: Joi.number().required(),
            duration: Joi.number().required(),
            aiMetadata: Joi.object({
                // ✅ DÜZELTİLDİ: Enum listesi Model ile eşitlendi (intermediate/advanced eklendi)
                complexityLevel: Joi.string().valid('low', 'medium', 'high', 'intermediate', 'advanced').required(),
                requiredSkills: Joi.array().items(Joi.string()).required(),
            }).required(),
        })
    ).optional(), 
}).min(1); 

/**
 * DTO Tipi (TypeScript için)
 */
export interface UpdateInterviewDTO {
    title?: string;
    description?: string;
    expirationDate?: Date;
    personalityTestId?: string | null;
    status?: 'active' | 'completed' | 'published' | 'draft' | 'inactive';
    type?: 'async-video' | 'live-video' | 'audio-only' | 'text-based';
    stages?: {
        personalityTest?: boolean;
        questionnaire?: boolean;
    };
    position?: {
        title?: string;
        department?: string;
        competencyWeights?: {
            technical?: number;
            communication?: number;
            problem_solving?: number;
        };
        description?: string;
    };
    aiAnalysisSettings?: {
        useAutomaticScoring?: boolean;
        gestureAnalysis?: boolean;
        speechAnalysis?: boolean;
        eyeContactAnalysis?: boolean;
        tonalAnalysis?: boolean;
        keywordMatchScore?: number;
    };
    questions?: {
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