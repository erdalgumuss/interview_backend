import Joi from 'joi';

export const videoResponseSchema = Joi.object({
    applicationId: Joi.string().required(),

    questionId: Joi.string().required(),

    videoUrl: Joi.string().uri().required().messages({
        'string.uri': 'Video URL must be a valid URI format.',
    }),

    duration: Joi.number().min(5).max(300).required().messages({
        'number.min': 'Video response must be at least 5 seconds.',
        'number.max': 'Video response cannot exceed 300 seconds (5 minutes).',
    }),

    textAnswer: Joi.string().optional(),

    aiAnalysisRequired: Joi.boolean().default(true),
});
