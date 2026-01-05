// src/modules/application/dtos/submitResponse.dto.ts

import Joi from 'joi';

/**
 * Adayın tek bir soruya verdiği cevabı kaydetmek için kullanılır.
 * Genellikle video upload işlemi tamamlandıktan sonra çağrılır.
 */
export const submitResponseSchema = Joi.object({
  questionId: Joi.string().required().messages({
    'any.required': 'Soru ID bilgisi zorunludur.',
  }),
  // Video URL'i (S3, Cloudfront vb. yükleme sonrası gelen link)
  videoUrl: Joi.string().uri().optional().allow(null, ''),
  
  // Eğer metin tabanlı bir soruysa veya transkript manuel gönderiliyorsa
  textAnswer: Joi.string().optional().allow(null, ''),
  
  // Videonun süresi (saniye cinsinden analitik için önemli)
  duration: Joi.number().min(0).optional(),
})
.or('videoUrl', 'textAnswer') // En az biri dolu olmalı (Hem video hem metin boş olamaz)
.messages({
  'object.missing': 'En az bir cevap (Video veya Metin) gönderilmelidir.'
});

export interface SubmitResponseDTO {
  questionId: string;
  videoUrl?: string;
  textAnswer?: string;
  duration?: number;
}