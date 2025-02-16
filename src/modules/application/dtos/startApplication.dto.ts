import Joi from 'joi';

export const startApplicationSchema = Joi.object({
    applicationId: Joi.string().required().messages({
        'any.required': 'Application ID is required.',
    }),

    phoneVerified: Joi.boolean().valid(true).required().messages({
        'any.only': 'Phone verification is required before starting the interview.',
    }),

    personalityTestCompleted: Joi.boolean().optional(),

    startTime: Joi.date().iso().default(() => new Date()),
});
