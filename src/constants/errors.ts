// src/constants/errors.ts

// Dilerseniz enum veya obje şeklinde saklayabilirsiniz.
export enum ErrorCodes {
    // Genel Hata Kodları
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    VALIDATION_ERROR = 'VALIDATION_ERROR',

    // Auth Modülü Özel Hata Kodları
    EMAIL_IN_USE = 'EMAIL_IN_USE',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',

    // Subscription Modülü vb. özel kodlar
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',

    // Interview / Application vb. özel kodlar
    INTERVIEW_NOT_FOUND = 'INTERVIEW_NOT_FOUND',
    APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
}

