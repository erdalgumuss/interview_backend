import Joi from 'joi';

/**
 * Mülakat güncelleme DTO'su
 */
export const updateInterviewSchema = Joi.object({
    title: Joi.string().optional().min(5).max(100),
    expirationDate: Joi.date().optional(),
    status: Joi.string().valid('active', 'completed', 'published', 'draft', 'inactive').optional(),
    stages: Joi.object({
        personalityTest: Joi.boolean().optional(),
        questionnaire: Joi.boolean().optional(),
    }).optional(),
    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().optional(),
            expectedAnswer: Joi.string().optional(),
            explanation: Joi.string().optional(),
            keywords: Joi.array().items(Joi.string()).optional(),
            order: Joi.number().optional(),
            duration: Joi.number().optional(),
            aiMetadata: Joi.object({
                complexityLevel: Joi.string().valid('low', 'medium', 'high').optional(),
                requiredSkills: Joi.array().items(Joi.string()).optional(),
            }).optional(),
        })
    ).optional(),
});
