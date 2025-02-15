// src/utils/tokenUtils.ts

import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenPayload extends JwtPayload {
    userId: string;
    email?: string;
    role?: string;
    iat?: number;
    exp?: number;
}
const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || 'super_secret_key';

/**
 * Kullanıcı email doğrulama tokeni üretir
 */
export function generateEmailVerificationToken(userId: string): string {
    return jwt.sign({ userId }, EMAIL_VERIFICATION_SECRET, { expiresIn: '1h' }); // 1 saat geçerli
}

/**
 * Token doğrulama
 */
export function verifyEmailVerificationToken(token: string): { userId: string } {
    return jwt.verify(token, EMAIL_VERIFICATION_SECRET) as { userId: string };
}
// src/utils/tokenUtils.ts

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecret';

/**
 * Access Token üretir (kısa süreli, örn. 15dk)
 */
export function generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Refresh Token üretir (daha uzun, örn. 7 gün)
 */
export function generateRefreshToken(payload: Record<string, any>): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Token doğrulama (Opsiyonel)
 */


export function verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (!decoded.userId  || !decoded.role) {
        console.error('❌ Token verification failed: Missing required fields', decoded);
        throw new Error('Unauthorized: Invalid token');
    }

    return decoded;
}

export function generatePasswordResetToken(): { token: string; expires: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika geçerli
    return { token, expires };
}
