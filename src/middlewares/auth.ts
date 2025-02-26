import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/error/appError';
import { ErrorCodes } from '../constants/errors';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        let token: string | undefined;

        // Access token'ı önce cookie'den, sonra header'dan al
        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        } else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.error('❌ No access token provided.');
            return next(new AppError('Unauthorized: No token provided', ErrorCodes.UNAUTHORIZED, 401));
        }

        // Token'ı doğrula ve süresi doldu mu kontrol et
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string; exp: number };
        } catch (err: any) {
            console.error(`❌ Token verification failed: ${err.name} - ${err.message}`);
            if (err.name === 'TokenExpiredError') {
                return next(new AppError('Session expired, please log in again', ErrorCodes.UNAUTHORIZED, 401));
            }
            return next(new AppError('Unauthorized: Invalid or expired token', ErrorCodes.UNAUTHORIZED, 401));
        }

        if (!decoded.userId || !decoded.role) {
            console.error('❌ Invalid token payload:', decoded);
            return next(new AppError('Unauthorized: Invalid token', ErrorCodes.UNAUTHORIZED, 401));
        }

        req.user = {
            id: decoded.userId,
            role: decoded.role ?? 'user',
        };

        console.log(`✅ User authenticated: ID=${req.user.id}, Role=${req.user.role}`);
        next();
    } catch (error) {
        console.error('❌ Authentication Error:', error);
        next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
    }
}

// Aday doğrulama
export const authenticateCandidate = (req: Request, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        } else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.warn('⚠ No access token provided for candidate.');
            return next(new AppError('Authorization token missing', ErrorCodes.UNAUTHORIZED, 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { applicationId: string };

        if (!decoded.applicationId) {
            console.error('❌ Candidate token invalid.');
            return next(new AppError('Invalid token', ErrorCodes.UNAUTHORIZED, 401));
        }

        req.body.applicationId = decoded.applicationId;
        next();
    } catch (err) {
        console.error('❌ Candidate authentication failed:', err);
        return next(new AppError('Invalid or expired token', ErrorCodes.UNAUTHORIZED, 401));
    }
};

// Admin doğrulama
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        console.warn(`🚨 Unauthorized admin access attempt. User ID=${req.user?.id}, Role=${req.user?.role}, IP=${req.ip}`);
        return next(new AppError('Access denied: Admins only', ErrorCodes.UNAUTHORIZED, 403));
    }
    next();
};
