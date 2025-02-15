// src/modules/auth/dtos/changePassword.dto.ts

import Joi from 'joi';

export const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().min(8).required(),
    newPassword: Joi.string().min(8).required(),
});
