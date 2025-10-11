// src/middlewares/error/appError.ts

import { ErrorCodes } from '../../constants/errors'; // ErrorCodes'u kullanmak için import ediyoruz

/**
 * Uygulama genelinde kullanılacak özel hata sınıfı.
 * Tüm iş kuralları ve API hataları bu sınıf ile fırlatılmalıdır.
 */
export class AppError extends Error {
    public code: ErrorCodes; // constants/errors.ts'deki özel hata kodu
    public statusCode: number; // HTTP durum kodu (400, 401, 404, 500 vb.)
    public isOperational: boolean; // Kullanıcı/geliştirici hatası olup olmadığını belirtir

    constructor(message: string, code: ErrorCodes, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Stack trace'i kaydet (Node.js için önemlidir)
        Error.captureStackTrace(this, this.constructor);
    }
}