import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/error/appError';
import { ErrorCodes } from '../constants/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface CandidateAuthRequest extends Request {
    candidate?: { applicationId: string };
}

/**
 * ✅ Aday token doğrulama middleware'i
 */
export const candidateAuth = (req: CandidateAuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new AppError('Authentication token missing', ErrorCodes.UNAUTHORIZED, 401);
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { applicationId: string };

        req.candidate = { applicationId: decoded.applicationId };
        next();
    } catch (error) {
        next(new AppError('Invalid or expired token', ErrorCodes.UNAUTHORIZED, 401));
    }
};
