import Joi from 'joi';

/**
 * Mülakat oluşturma için DTO şeması
 */
export const createInterviewSchema = Joi.object({
    title: Joi.string().required().min(5).max(100),
    
    expirationDate: Joi.alternatives([
      Joi.date().iso(),
      Joi.number().integer().min(1000000000000) // Timestamp formatı da kabul et
  ]).required().messages({
      'date.base': 'Expiration date must be a valid ISO date or timestamp.',
      'any.required': 'Expiration date is required.'
  }),
    personalityTestId: Joi.string().optional(),
    stages: Joi.object({
        personalityTest: Joi.boolean().default(false),
        questionnaire: Joi.boolean().default(true),
    }).required(),
    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().required(),
            expectedAnswer: Joi.string().required(),
            explanation: Joi.string().optional(),
            keywords: Joi.array().items(Joi.string()).required(),
            order: Joi.number().required(),
            duration: Joi.number().required(),
            aiMetadata: Joi.object({
                complexityLevel: Joi.string().valid('low', 'medium', 'high').required(),
                requiredSkills: Joi.array().items(Joi.string()).required(),
            }).required(),
        })
    ).required(),
});


/**
 * DTO Tipi (TypeScript için)
 */
export interface CreateInterviewDTO {
    title: string;
    expirationDate: Date;
    personalityTestId?: string;
    stages: {
        personalityTest: boolean;
        questionnaire: boolean;
    };
    status?: 'active' | 'completed' | 'published' | 'draft' | 'inactive';
    questions: {
        questionText: string;
        expectedAnswer: string;
        explanation?: string;
        keywords: string[];
        order: number;
        duration: number;
        aiMetadata: {
            complexityLevel: 'low' | 'medium' | 'high';
            requiredSkills: string[];
        };
    }[];
}
