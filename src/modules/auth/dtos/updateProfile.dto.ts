// src/modules/user/dtos/updateProfile.dto.ts
import Joi from 'joi';

export const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    bio: Joi.string().max(300).optional(),
    profilePicture: Joi.string().uri().optional(), // URL formatında olmalı
    
});
