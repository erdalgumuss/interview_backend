// src/middlewares/validationMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Joi şemalarına göre gelen veriyi doğrulamak için genel middleware
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        next();
    };
};
