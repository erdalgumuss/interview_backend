// src/modules/auth/dtos/updateProfile.dto.ts

import Joi from 'joi';
import { IUser } from '../models/user.model'; // IUser tipini kullandığınızı varsayarak

// 1. TypeScript Tipini Dışa Aktarın (export edin)
export type UpdateProfileDTO = Pick<IUser, 'name' | 'phone' | 'bio' | 'profilePicture'>;

export const updateProfileSchema = Joi.object<UpdateProfileDTO>({
    name: Joi.string().min(2).max(50).optional(), // Opsiyonel olmalı
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    bio: Joi.string().max(300).optional(),
    profilePicture: Joi.string().uri().optional(), 
});