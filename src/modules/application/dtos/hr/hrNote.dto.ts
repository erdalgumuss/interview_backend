// src/modules/application/dtos/hrNote.dto.ts

import Joi from 'joi';

/**
 * İK Notu Ekleme DTO
 */
export interface AddHRNoteDTO {
  applicationId: string;
  content: string;
  isPrivate?: boolean; // Varsayılan false
}

export const addHRNoteSchema = Joi.object<AddHRNoteDTO>({
  applicationId: Joi.string()
    .required()
    .messages({
      'any.required': 'Başvuru ID zorunludur.',
    }),

  content: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'any.required': 'Not içeriği zorunludur.',
      'string.min': 'Not içeriği en az 10 karakter olmalıdır.',
      'string.max': 'Not içeriği en fazla 2000 karakter olabilir.',
    }),

  isPrivate: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'isPrivate alanı boolean olmalıdır.',
    }),
});

/**
 * İK Notu Güncelleme DTO
 */
export interface UpdateHRNoteDTO {
  applicationId: string;
  noteId: string;
  content?: string;
  isPrivate?: boolean;
}

export const updateHRNoteSchema = Joi.object<UpdateHRNoteDTO>({
  applicationId: Joi.string()
    .required()
    .messages({
      'any.required': 'Başvuru ID zorunludur.',
    }),

  noteId: Joi.string()
    .required()
    .messages({
      'any.required': 'Not ID zorunludur.',
    }),

  content: Joi.string()
    .min(10)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Not içeriği en az 10 karakter olmalıdır.',
      'string.max': 'Not içeriği en fazla 2000 karakter olabilir.',
    }),

  isPrivate: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isPrivate alanı boolean olmalıdır.',
    }),
});

/**
 * İK Notu Silme DTO
 */
export interface DeleteHRNoteDTO {
  applicationId: string;
  noteId: string;
}

export const deleteHRNoteSchema = Joi.object<DeleteHRNoteDTO>({
  applicationId: Joi.string()
    .required()
    .messages({
      'any.required': 'Başvuru ID zorunludur.',
    }),

  noteId: Joi.string()
    .required()
    .messages({
      'any.required': 'Not ID zorunludur.',
    }),
});
