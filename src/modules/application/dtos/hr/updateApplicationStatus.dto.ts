// src/modules/application/dtos/updateApplicationStatus.dto.ts

import Joi from 'joi';
import { ApplicationStatus } from '../../models/application.model';

// İK kullanıcısının sadece bu dört ana durumu belirlemesini sağlarız.
// 'pending' durumunu da kapsayarak İK'nın tekrar incelemeye almasını sağlar.
export const IKAplicationStatuses: ApplicationStatus[] = [
    'pending',
    'completed', // Tamamlanmış ancak henüz karar verilmemiş başvurular için
    'rejected',
    'accepted',
];

export interface UpdateApplicationStatusDTO {
    status: 'pending' | 'rejected' | 'accepted';
    // İleride, ret nedeni veya kabul notu eklenebilir
    // reason?: string; 
}

/**
 * Başvuru Durumu Güncelleme Joi Şeması
 */
export const updateApplicationStatusSchema = Joi.object<UpdateApplicationStatusDTO>({
    status: Joi.string()
        .valid('pending', 'rejected', 'accepted')
        .required()
        .messages({
            'any.required': 'Durum alanı zorunludur.',
            'any.only': 'Geçerli durumlar: pending, rejected, accepted.',
        }),
});