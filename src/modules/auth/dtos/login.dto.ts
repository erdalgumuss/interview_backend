// src/modules/auth/dtos/login.dto.ts
import Joi from 'joi';
import { IUser } from '../models/user.model'; 

// TypeScript Tipi
export type LoginDTO = Pick<IUser, 'email' | 'password'>;

// Joi Doğrulama Şeması
export const loginSchema = Joi.object<LoginDTO>({
    email: Joi.string().email().required().messages({
        'string.email': 'Geçerli bir e-posta adresi girin.',
        'any.required': 'E-posta zorunludur.',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Şifre zorunludur.',
    }),
});