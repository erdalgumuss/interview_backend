// src/middlewares/validationMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './error/appError'; // Hata yönetim sınıfını içe aktarıyoruz
import { ErrorCodes } from '../constants/errors'; // Hata kodları için

/**
 * Joi şemalarına göre gelen veriyi doğrulamak için genel middleware
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,  // Tüm validasyon hatalarını görmek için
            allowUnknown: false, // Bilinmeyen alanları kabul etmemek için
            stripUnknown: true  // Schema'da olmayan alanları kaldırmak için
        });

        if (error) {
            // Hataları okunaklı bir formata dönüştür
            const errorMessages = error.details.map(detail => detail.message);

            return next(new AppError(errorMessages.join(', '), ErrorCodes.BAD_REQUEST, 400));
        }

        next();
    };
};
