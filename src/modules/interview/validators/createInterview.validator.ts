import Joi from 'joi';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';

export const createInterviewSchema = Joi.object<CreateInterviewDTO>({
    title: Joi.string().required().messages({
        'any.required': 'Interview title is required.',
        'string.empty': 'Interview title cannot be empty.'
    }),

    expirationDate: Joi.alternatives([
        Joi.date().iso(),
        Joi.number().integer().min(1000000000000) // ✅ Timestamp desteği
    ]).required().messages({
        'date.base': 'Expiration date must be a valid ISO date or timestamp.',
        'any.required': 'Expiration date is required.'
    }),

    status: Joi.string()
        .valid('active', 'completed', 'published', 'draft', 'inactive')
        .optional(),

    personalityTestId: Joi.string().optional().allow(''),

    stages: Joi.object({
        personalityTest: Joi.boolean().default(false),
        questionnaire: Joi.boolean().default(true)
    }).optional().default({ personalityTest: false, questionnaire: true }),

    questions: Joi.array().items(
        Joi.object({
            questionText: Joi.string().required(),
            expectedAnswer: Joi.string().required(),
            explanation: Joi.string().optional().allow(''),
            keywords: Joi.array().items(Joi.string()).required(),
            order: Joi.number().required(),
            duration: Joi.number().required(),
            aiMetadata: Joi.object({
                complexityLevel: Joi.string().valid('low', 'medium', 'high').required(),
                requiredSkills: Joi.array().items(Joi.string()).required(),
            }).required()
        })
    ).optional().default([]),
});
