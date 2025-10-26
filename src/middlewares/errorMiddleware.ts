// src/middlewares/errorMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors/appError'; // appError.ts'den import edildi
import { ErrorCodes } from '../constants/errors';
import mongoose from 'mongoose';

/**
 * Global Hata Yakalama Middleware'i
 * Express'te 4 parametreli fonksiyon, hata yakalayıcı olarak tanınır.
 */
export const errorMiddleware = (
    err: Error | AppError, // Hem özel AppError'ı hem de standart Error'ları kabul et
    req: Request,
    res: Response,
    next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
    let error = err;

    // 1. Varsayılan Hata Ayarları (500 Internal Server Error)
    let statusCode = error instanceof AppError ? error.statusCode : 500;
    let code = error instanceof AppError ? error.code : ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = error.message || 'Something went wrong on the server.';

    // Geliştirme Ortamında Hata Mesajını Konsola Yazdır
    console.error(`\n🚨 Server Error (${code}): ${message}\n`, error);
    
    // --- Hata Sınıflandırma ve Dönüşümler ---
    
    // 2. Mongoose CastError: Yanlış ObjectId Formatı
    // Örnek: GET /interviews/123 (123 geçerli bir ObjectId değil)
    if (error instanceof mongoose.Error.CastError) {
        const value = error.value;
        const kind = error.kind;
        message = `Invalid field value: ${value} for type ${kind}.`;
        code = ErrorCodes.BAD_REQUEST;
        statusCode = 400;
    }
    
    // 3. Mongoose Duplicate Key Error (MongoDB Code 11000)
    // Örnek: Aynı email ile birden fazla kayıt denemesi
    if ((error as any).code === 11000) {
        const value = Object.keys((error as any).keyValue)[0];
        message = `Duplicate field value: ${value}. Please use another value.`;
        code = ErrorCodes.CONFLICT; // Çakışma hatası
        statusCode = 409;
    }

    // 4. Mongoose Validation Error (Schema Doğrulama Hatası)
    // Örnek: Zorunlu bir alanı boş bırakma
    if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map((el: any) => el.message);
        message = `Invalid input data: ${errors.join('. ')}`;
        code = ErrorCodes.VALIDATION_ERROR;
        statusCode = 400;
    }

    // 5. Servis Katmanından Gelen Standart İş Mantığı Hatalarını Dönüştürme
    // NOT: Bizim Servisimiz (InterviewService) artık AppError fırlatıyor,
    // ancak başka bir Servis hala 'throw new Error("...");' yapıyorsa
    // ve bu hata 400 ile ilişkiliyse:
    if (!(error instanceof AppError) && (
         message.includes('must contain at least one question') || 
         message.includes('Invalid expiration date format') || 
         message.includes('Cannot publish an interview with status')
         // ... buraya 400'e çevirmek istediğiniz diğer standart Business Logic hatalarını ekleyin
    )) {
        statusCode = 400;
        code = ErrorCodes.BAD_REQUEST;
    }
    
    // --- Yanıt Gönderme ---
    
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        code: code,
        message: message,
        // Geliştirme aşamasında stack'i göndermek debug için faydalı olabilir
        // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
};