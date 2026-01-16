// src/modules/application/dtos/otpVerify.dto.ts

import Joi from 'joi';
import { IApplication } from '../../models/application.model';

export const verifyOtpSchema = Joi.object({
  applicationId: Joi.string().required(),
  otpCode: Joi.string().min(4).max(8).required(), // Kod uzunluğuna göre ayarlayabilirsin
});

export interface VerifyOtpDTO {
  applicationId: string;
  otpCode: string;
}
export interface VerifyOtpResponseDTO {
  token: string;
  application: IApplication;
  newOtpSent: boolean;  // ✅ Yeni OTP gönderildi mi?
  expiresAt?: Date;  // ✅ OTP'nin yeni süresi
}
export const resendOtpSchema = Joi.object({
    applicationId: Joi.string().required(),
    
  });
  