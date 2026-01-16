import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/errors/appError';
import { ErrorCodes } from '../constants/errors';
import { access } from 'fs';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                applicationId?: string; // ✅ Candidate için eklendi
            };
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    console.log("🔑 JWT_SECRET from .env:", process.env.JWT_SECRET);

    try {
        let token: string | undefined;

        // Access token'ı önce cookie'den, sonra header'dan al
        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        } 

        if (!token) {
            console.error('❌ No access token provided.');
            return next({ status: 401, message: 'Unauthorized: No token provided', code: 'TOKEN_INVALID' });
        }

        // Token'ı doğrula ve süresi doldu mu kontrol et
        let decoded;
        console.log("🔑 token:", token);

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string; exp: number };
        } catch (err: any) {
            console.error(`❌ Token verification failed: ${err.name} - ${err.message}`);

            if (err.name === 'TokenExpiredError') {
                return next({ status: 401, message: 'Session expired, please log in again', code: 'TOKEN_EXPIRED' });
            }
            return next({ status: 401, message: 'Unauthorized: Invalid or expired token', code: 'TOKEN_INVALID' });
        }

        if (!decoded.userId || !decoded.role) {
            console.error(`❌ Invalid token payload: ${JSON.stringify(decoded)}`);
            return next({ status: 401, message: 'Invalid token structure', code: 'TOKEN_INVALID' });
        }

        req.user = {
            id: decoded.userId,
            role: decoded.role ?? 'user',
        };

        console.log(`✅ User authenticated: ID=${req.user.id}, Role=${req.user.role}`);
        next();
    } catch (error) {
        console.error('❌ Authentication Error:', error);
        next({ status: 401, message: 'Unauthorized', code: 'UNAUTHORIZED' });
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

        // ✅ req.user set ederek controller'dan erişilebilir hale getiriyoruz
        req.user = {
            id: decoded.applicationId,
            role: 'candidate',
            applicationId: decoded.applicationId
        };
        
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
