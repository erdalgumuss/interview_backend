// src/modules/application/dtos/applicationFilter.dto.ts

import Joi from 'joi';
import { ApplicationStatus } from '../models/application.model';

/**
 * Başvuru Filtreleme DTO (İK Dashboard)
 */
export interface ApplicationFilterDTO {
  interviewId?: string; // Belirli bir mülakat
  status?: ApplicationStatus | ApplicationStatus[] | 'all'; // Duruma göre
  query?: string; // Aday ismi, e-posta ile arama
  minScore?: number; // Minimum AI skoru
  maxScore?: number; // Maksimum AI skoru
  isFavorite?: boolean; // Favori adaylar
  reviewedBy?: string; // Belirli İK tarafından incelenmiş
  isReviewed?: boolean; // İncelenmiş/incelenmemiş
  dateFrom?: Date; // Başlangıç tarihi
  dateTo?: Date; // Bitiş tarihi
  page?: number; // Sayfa numarası
  limit?: number; // Sayfa başına kayıt sayısı
  sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'name'; // Sıralama kriteri
  sortOrder?: 'asc' | 'desc'; // Sıralama yönü
}

export const applicationFilterSchema = Joi.object<ApplicationFilterDTO>({
  interviewId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Interview ID string olmalıdır.',
    }),

  status: Joi.alternatives()
    .try(
      Joi.string().valid(
        'pending',
        'otp_verified',
        'awaiting_video_responses',
        'in_progress',
        'awaiting_ai_analysis',
        'completed',
        'rejected',
        'accepted',
        'all'
      ),
      Joi.array().items(
        Joi.string().valid(
          'pending',
          'otp_verified',
          'awaiting_video_responses',
          'in_progress',
          'awaiting_ai_analysis',
          'completed',
          'rejected',
          'accepted'
        )
      )
    )
    .optional()
    .messages({
      'any.only': 'Geçersiz status değeri.',
    }),

  query: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Arama terimi en az 2 karakter olmalıdır.',
      'string.max': 'Arama terimi en fazla 100 karakter olabilir.',
    }),

  minScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Minimum skor 0-100 arasında olmalıdır.',
      'number.max': 'Minimum skor 0-100 arasında olmalıdır.',
    }),

  maxScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Maksimum skor 0-100 arasında olmalıdır.',
      'number.max': 'Maksimum skor 0-100 arasında olmalıdır.',
    }),

  isFavorite: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isFavorite boolean olmalıdır.',
    }),

  reviewedBy: Joi.string()
    .optional()
    .messages({
      'string.base': 'Reviewed by ID string olmalıdır.',
    }),

  isReviewed: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isReviewed boolean olmalıdır.',
    }),

  dateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Başlangıç tarihi ISO 8601 formatında olmalıdır.',
    }),

  dateTo: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Bitiş tarihi ISO 8601 formatında olmalıdır.',
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.min': 'Sayfa numarası en az 1 olmalıdır.',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      'number.min': 'Limit en az 1 olmalıdır.',
      'number.max': 'Limit en fazla 100 olabilir.',
    }),

  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'score', 'name')
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'Geçersiz sıralama kriteri.',
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'Sıralama yönü asc veya desc olmalıdır.',
    }),
});
