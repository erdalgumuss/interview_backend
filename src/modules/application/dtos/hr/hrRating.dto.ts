// src/modules/application/dtos/hrRating.dto.ts

import Joi from 'joi';

/**
 * İK Rating (Manuel Değerlendirme) DTO
 */
export interface UpdateHRRatingDTO {
  applicationId: string;
  rating: number; // 1-5 arası
}

export const updateHRRatingSchema = Joi.object<UpdateHRRatingDTO>({
  applicationId: Joi.string()
    .required()
    .messages({
      'any.required': 'Başvuru ID zorunludur.',
    }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'any.required': 'Rating zorunludur.',
      'number.min': 'Rating en az 1 olmalıdır.',
      'number.max': 'Rating en fazla 5 olabilir.',
      'number.integer': 'Rating tam sayı olmalıdır.',
    }),
});
