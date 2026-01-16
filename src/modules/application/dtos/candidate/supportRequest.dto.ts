// src/modules/application/dtos/supportRequest.dto.ts
import Joi from 'joi';

export class SupportRequestDTO {
  message: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
  }>;

  constructor(data: {
    message: string;
    attachments?: Array<{
      type: 'image' | 'document';
      url: string;
    }>;
  }) {
    this.message = data.message;
    this.attachments = data.attachments;
  }
}

export const supportRequestSchema = Joi.object({
  message: Joi.string().required().min(10).max(500),
  attachments: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('image', 'document').required(),
      url: Joi.string().uri().required()
    })
  ).optional()
});