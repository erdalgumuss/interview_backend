// src/modules/interview/validators/createInterview.validator.ts

import Joi from 'joi';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';

export const createInterviewSchema = Joi.object<CreateInterviewDTO>({
    title: Joi.string().required().messages({
        'any.required': 'Interview title is required.',
        'string.empty': 'Interview title cannot be empty.'
    }),

    expirationDate: Joi.date().iso().required().messages({
        'date.base': 'Expiration date must be a valid date.',
        'date.format': 'Expiration date must be in ISO 8601 format.',
        'any.required': 'Expiration date is required.'
    }),

    status: Joi.string()
        .valid('active', 'completed', 'published', 'draft', 'inactive')
        .optional(),

    personalityTestId: Joi.string().optional(),

    stages: Joi.object({
        personalityTest: Joi.boolean().default(false),
        questionnaire: Joi.boolean().default(true)
    }).optional(),

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
                // keywordMatchScore şimdilik cevaplarda hesaplanacağı için opsiyonel
            }).required()
        })
    ).optional()
});
