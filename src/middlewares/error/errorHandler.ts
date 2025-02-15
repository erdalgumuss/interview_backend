// src/middlewares/error/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from './appError'; // Bir önceki adımdaki özel hata sınıfı
import { ErrorCodes } from '../../constants/errors';

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    // Eğer bizim oluşturduğumuz AppError ise
    if (err instanceof AppError) {
        return res.status(err.httpStatus).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details || null,
            },
        });
    }

    // Yoksa Express veya sistemsel bir hata
    // Bunu da loglamak isteyebilirsiniz (örn. winston logger)
    console.error(err);

    // Geriye generic bir hata dönüyoruz
    return res.status(500).json({
        success: false,
        error: {
            code: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Something went wrong',
        },
    });
}
