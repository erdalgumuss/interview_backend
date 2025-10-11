// src/modules/auth/dtos/register.dto.ts
import Joi from 'joi';
import { IUser } from '../models/user.model'; 

// TypeScript Tipi
export type RegisterDTO = Pick<IUser, 'name' | 'email' | 'password' | 'role' | 'phone'>;

// Joi Doğrulama Şeması (Backend Güvenlik Kuralları Uygulanmıştır)
export const registerSchema = Joi.object<RegisterDTO>({
    name: Joi.string().trim().min(2).max(50).required().messages({
        'string.min': 'İsim en az 2 karakter olmalıdır.',
        'any.required': 'İsim zorunludur.',
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Geçerli bir e-posta adresi girin.',
        'any.required': 'E-posta zorunludur.',
    }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .required()
        .messages({
            'string.min': 'Şifre en az 8 karakter olmalıdır.',
            'string.pattern.base': 'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
            'any.required': 'Şifre zorunludur.',
        }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
        'string.pattern.base': 'Geçerli bir telefon numarası girin.',
    }),
    role: Joi.string().valid('admin', 'company', 'user').default('user').optional(),
});