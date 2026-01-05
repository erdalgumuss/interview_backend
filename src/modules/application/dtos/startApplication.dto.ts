// src/modules/application/dtos/startApplication.dto.ts

import Joi from 'joi';

export const startApplicationSchema = Joi.object({
  // 🔒 GÜVENLİK DÜZELTMESİ:
  // phoneVerified, personalityTestCompleted ve startTime alanları TAMAMEN kaldırıldı.
  // Bu verilerin doğruluğunu ve zamanlamasını Client'tan gelen veriye güvenerek değil,
  // Backend Service katmanında veritabanı kayıtlarına bakarak yapacağız.
  
  applicationId: Joi.string().required().messages({
    'any.required': 'Application ID is required.',
  }),
});

export interface StartApplicationDTO {
  applicationId: string;
}