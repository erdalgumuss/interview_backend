// src/middlewares/error/appError.ts

import { ErrorCodes } from '../../constants/errors';

export class AppError extends Error {
    public httpStatus: number;
    public code: ErrorCodes;
    public details?: any;

    constructor(
        message: string,
        code: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR,
        httpStatus = 500,
        details?: any
    ) {
        super(message);

        // Farklı dilde yazanlar bazen name = this.constructor.name olarak da atar
        this.name = 'AppError';
        this.httpStatus = httpStatus;
        this.code = code;
        this.details = details;
        // Çünkü TypeScript ile miras alınan Error'larda prototip ayarı yapmak gerekebiliyor:
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
