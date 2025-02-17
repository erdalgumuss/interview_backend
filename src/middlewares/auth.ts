import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokenUtils';
import { AppError } from '../middlewares/error/appError';
import jwt from 'jsonwebtoken';
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

        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        } else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.error('❌ No token provided');
            return next(new AppError('Unauthorized: No token provided', ErrorCodes.UNAUTHORIZED, 401));
        }

        // Token'ı doğrula
        const decoded = verifyAccessToken(token);
        
        if (!decoded || !decoded.userId || !decoded.role) {
            console.error('❌ Token verification failed:', decoded);
            return next(new AppError('Unauthorized: Invalid token', ErrorCodes.UNAUTHORIZED, 401));
        }

        req.user = {
            id: decoded.userId,
            role: decoded.role ?? 'user',
        };

        console.log('✅ User authenticated:', req.user);
        next();
    } catch (error) {
        console.error('❌ Authentication Error:', error);
        next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
    }
}
export const authenticateCandidate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError('Authorization token missing', ErrorCodes.UNAUTHORIZED, 401);
  
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { applicationId: string };
      req.body.applicationId = decoded.applicationId;
      next();
    } catch (err) {
      throw new AppError('Invalid token', ErrorCodes.UNAUTHORIZED, 401);
    }
  };