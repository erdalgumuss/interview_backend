// src/modules/auth/validators/register.validator.ts

import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().optional(),
    role: Joi.string().valid('admin', 'company', 'user').optional(),
});
