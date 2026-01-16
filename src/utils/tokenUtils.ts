import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { AUTH_CONFIG } from '../config/auth.config';

interface TokenPayload extends JwtPayload {
    userId: string;
    email?: string;
    role?: string;
    iat?: number;
    exp?: number;
}

interface RefreshTokenPayload extends JwtPayload {
    userId: string;
    version: number;
    sessionId: string;      // Unique session identifier
    absoluteExp: number;    // Absolute expiration timestamp (90 days max)
}

const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || 'super_secret_key';
const NEXT_PUBLIC_JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
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
 * Enterprise: 15 dakika geçerli
 */
export function generateAccessToken(userId: string, role: string): string {
    return jwt.sign(
        { 
            userId, 
            role,
            iss: AUTH_CONFIG.TOKEN_ISSUER,
            aud: AUTH_CONFIG.TOKEN_AUDIENCE,
        }, 
        NEXT_PUBLIC_JWT_SECRET, 
        { 
            expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
            algorithm: "HS256"
        }
    );
}

/**
 * Refresh Token üretir (Sliding window, 30 gün)
 * - sessionId: Her login'de unique, oturum takibi için
 * - absoluteExp: Maksimum 90 gün sonra expire olur (zorunlu re-login)
 */
export function generateRefreshToken(
    userId: string, 
    version: number, 
    sessionId?: string,
    absoluteExp?: number
): string {
    const now = Date.now();
    const newSessionId = sessionId || crypto.randomUUID();
    
    // İlk oluşturulduğunda absoluteExp 90 gün sonra
    // Sonraki refresh'lerde mevcut absoluteExp korunur
    const finalAbsoluteExp = absoluteExp || 
        now + (AUTH_CONFIG.ABSOLUTE_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000);
    
    return jwt.sign(
        { 
            userId, 
            version,
            sessionId: newSessionId,
            absoluteExp: finalAbsoluteExp,
            iss: AUTH_CONFIG.TOKEN_ISSUER,
            aud: AUTH_CONFIG.TOKEN_AUDIENCE,
        }, 
        JWT_REFRESH_SECRET, 
        { expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY }
    );
}

/**
 * Refresh Token'ı decode et ve payload'ı döndür
 */
export function decodeRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Refresh token'ın absolute expiry kontrolü
 * 90 gün geçtiyse token geçersiz
 */
export function isAbsoluteExpired(absoluteExp: number): boolean {
    return Date.now() > absoluteExp;
}

/**
 * Access Token doğrulama
 */
export function verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, NEXT_PUBLIC_JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;

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

