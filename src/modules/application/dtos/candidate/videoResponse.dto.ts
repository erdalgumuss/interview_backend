// src/modules/application/dtos/videoResponse.dto.ts

import Joi from "joi";
import { VideoUploadStatus } from "../../models/application.model";

/**
 * Video Yanıt Gönderme DTO
 */
export interface VideoResponseDTO {
  applicationId: string;
  questionId: string;
  videoUrl: string;
  duration: number;
  textAnswer?: string;
  aiAnalysisRequired?: boolean; // AI analizi gerekli mi?
}

/**
 * Video Upload Status Güncelleme DTO
 */
export interface UpdateVideoUploadStatusDTO {
  applicationId: string;
  questionId: string;
  uploadStatus: VideoUploadStatus;
  uploadError?: string;
  s3Metadata?: {
    bucket: string;
    key: string;
    size: number;
    contentType: string;
    etag?: string;
  };
}

/**
 * Video Yanıtı Joi Şeması (body validation - applicationId middleware'den geliyor)
 */
export const videoResponseSchema = Joi.object({
  questionId: Joi.string()
    .required()
    .length(24) // MongoDB ObjectId formatı
    .messages({
      "any.required": "Soru ID zorunludur.",
      "string.length": "Soru ID geçersiz format (24 karakter olmalı).",
    }),

  videoUrl: Joi.string()
    .required()
    // S3 key formatı: videos/appId/questionId/timestamp.webm
    // veya tam URL: https://bucket.s3.region.amazonaws.com/...
    .messages({
      "any.required": "Video URL/Key zorunludur.",
    }),

  duration: Joi.number()
    .min(1) // 0 saniyeden uzun olmalı
    .required()
    .messages({
      "any.required": "Video süresi zorunludur.",
      "number.min": "Video süresi en az 1 saniye olmalıdır.",
    }),

  textAnswer: Joi.string()
    .max(5000) // Transkripsiyon veya metin yanıtı için makul bir sınır
    .optional(),

  aiAnalysisRequired: Joi.boolean()
    .default(true) // Varsayılan olarak AI analizi zorunlu olabilir
    .optional(),
});

/**
 * Video Upload Status Güncelleme Joi Şeması
 */
export const updateVideoUploadStatusSchema =
  Joi.object<UpdateVideoUploadStatusDTO>({
    applicationId: Joi.string().required().messages({
      "any.required": "Başvuru ID zorunludur.",
    }),

    questionId: Joi.string().required().messages({
      "any.required": "Soru ID zorunludur.",
    }),

    uploadStatus: Joi.string()
      .valid("pending", "uploading", "completed", "failed")
      .required()
      .messages({
        "any.required": "Upload durumu zorunludur.",
        "any.only":
          "Geçersiz upload durumu. (pending, uploading, completed, failed)",
      }),

    uploadError: Joi.string().max(500).optional().messages({
      "string.max": "Hata mesajı en fazla 500 karakter olabilir.",
    }),

    s3Metadata: Joi.object({
      bucket: Joi.string().required(),
      key: Joi.string().required(),
      size: Joi.number().min(0).required(),
      contentType: Joi.string().required(),
      etag: Joi.string().optional(),
    }).optional(),
  });
