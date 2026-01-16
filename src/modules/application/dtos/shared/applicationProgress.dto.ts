// src/modules/application/dtos/applicationProgress.dto.ts

import Joi from 'joi';
import { ApplicationStep } from '../models/application.model';

/**
 * Resume Logic için Progress Güncelleme DTO
 */
export interface UpdateApplicationProgressDTO {
  applicationId: string;
  currentStep: ApplicationStep;
  completedStep?: ApplicationStep; // Tamamlanan adım
}

export const updateApplicationProgressSchema = Joi.object<UpdateApplicationProgressDTO>({
  applicationId: Joi.string()
    .required()
    .messages({
      'any.required': 'Başvuru ID zorunludur.',
    }),

  currentStep: Joi.string()
    .valid(
      'otp_verification',
      'personal_info',
      'education',
      'experience',
      'skills',
      'personality_test',
      'video_responses',
      'completed'
    )
    .required()
    .messages({
      'any.required': 'Mevcut adım zorunludur.',
      'any.only': 'Geçersiz adım değeri.',
    }),

  completedStep: Joi.string()
    .valid(
      'otp_verification',
      'personal_info',
      'education',
      'experience',
      'skills',
      'personality_test',
      'video_responses',
      'completed'
    )
    .optional()
    .messages({
      'any.only': 'Geçersiz tamamlanan adım değeri.',
    }),
});

/**
 * Resume Application Response DTO
 */
export interface ResumeApplicationDTO {
  email: string;
  phone?: string; // Opsiyonel telefon doğrulaması
}

export const resumeApplicationSchema = Joi.object<ResumeApplicationDTO>({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'any.required': 'E-posta zorunludur.',
      'string.email': 'Geçerli bir e-posta adresi giriniz.',
    }),

  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Telefon numarası 10-15 rakamdan oluşmalıdır.',
    }),
});
