// src/modules/application/dtos/createApplication.dto.ts

import Joi from 'joi';

/**
 * Adayın ilk form verilerini (KVKK onayı dahil) topluyoruz.
 * Mülakat ID'yi de gönderiyor ki hangi mülakata başvurduğunu bilelim.
 */
export const createApplicationSchema = Joi.object({
  interviewId: Joi.string().required(),
  name: Joi.string().required(),
  surname: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?\d{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number must be a valid format (e.g., +905555555555).',
  }),
  kvkkConsent: Joi.boolean().valid(true).required().messages({
    'any.only': 'KVKK consent is required.',
  }),
});

export interface CreateApplicationDTO {
  interviewId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  kvkkConsent: boolean;
}
