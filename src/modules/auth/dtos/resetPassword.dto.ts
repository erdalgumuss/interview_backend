// src/modules/auth/dtos/resetPassword.dto.ts
import Joi from 'joi';

export interface ResetPasswordDTO {
    token: string;
    newPassword: string;
}

export const resetPasswordSchema = Joi.object<ResetPasswordDTO>({
    token: Joi.string().required().messages({
        'any.required': 'Token zorunludur.',
    }),
    newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .required()
        .messages({
            'string.min': 'Yeni şifre en az 8 karakter olmalıdır.',
            'string.pattern.base': 'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
            'any.required': 'Yeni şifre zorunludur.',
        }),
});