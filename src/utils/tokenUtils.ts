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
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecret';

/**
 * Kullanıcı email doğrulama tokeni üretir
 */
export function generateEmailVerificationToken(userId: string): string {
    return jwt.sign({ userId }, EMAIL_VERIFICATION_SECRET, { expiresIn: '1h' });
}

/**
 * Email doğrulama tokeni doğrulama
 */
export function verifyEmailVerificationToken(token: string): { userId: string } {
    return jwt.verify(token, EMAIL_VERIFICATION_SECRET) as { userId: string };
}

/**
 * Access Token üretir (Kısa süreli, userId ve role içerir)
 */
export function generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '10m' });
}

/**
 * Refresh Token üretir (Kullanıcıya özel versiyon içerir)
 */
export function generateRefreshToken(userId: string, version: number): string {
    return jwt.sign({ userId, version }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Access Token doğrulama
 */
export function verifyAccessToken(token: string): TokenPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

        if (!decoded.userId || !decoded.role) {
            console.error(`❌ Invalid token payload: ${JSON.stringify(decoded)}`);
            throw new Error('Unauthorized: Invalid token');
        }

        return decoded;
    } catch (err) {
        if (err instanceof Error) {
            console.error(`❌ Token verification failed: ${err.name} - ${err.message}`);
        } else {
            console.error('❌ Token verification failed: Unknown error');
        }
        throw new Error('Unauthorized: Invalid token');
    }
}

/**
 * Şifre sıfırlama tokeni üretir
 */
export function generatePasswordResetToken(): { token: string; expires: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika geçerli
    return { token, expires };
}

/**
 * Aday Token üretme (Güçlendirilmiş)
 */
export const generateCandidateToken = (applicationId: string) => {
  return jwt.sign({ applicationId }, process.env.JWT_SECRET!, { expiresIn: '3h' });
};

/**
 * Token hashleme (SHA-256)
 * Refresh token'lar güvenlik için hashlenerek veritabanında saklanır.
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

