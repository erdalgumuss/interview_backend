import Joi from 'joi';

export const updateCandidateSchema = Joi.object({
    name: Joi.string().optional(),
    surname: Joi.string().optional(),
    email: Joi.string().email().optional().messages({
        'string.email': 'Email must be a valid format.',
    }),
    phone: Joi.string().pattern(/^\+?\d{10,15}$/).optional().messages({
        'string.pattern.base': 'Phone number must be in a valid format (e.g., +905555555555).',
    }),
    education: Joi.array().items(
        Joi.object({
            school: Joi.string().optional(),
            degree: Joi.string().optional(),
            graduationYear: Joi.number().integer().min(1900).max(new Date().getFullYear()),
        })
    ).optional(),
    experience: Joi.array().items(
        Joi.object({
            company: Joi.string().optional(),
            position: Joi.string().optional(),
            duration: Joi.string().optional(),
            responsibilities: Joi.string().optional(),
        })
    ).optional(),
});
