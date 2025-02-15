// src/modules/auth/validators/login.validator.ts

import Joi from 'joi';

/**
 * Login isteği için validasyon şeması
 */
export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});
