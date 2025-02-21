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
 * Email doğrulama tokeni doğrulama
 */
export function verifyEmailVerificationToken(token: string): { userId: string } {
  return jwt.verify(token, EMAIL_VERIFICATION_SECRET) as { userId: string };
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecret';

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
 * Access Token doğrulama (Opsiyonel)
 */
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

  if (!decoded.userId || !decoded.role) {
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

export const generateCandidateToken = (applicationId: string) => {
  return jwt.sign({ applicationId }, process.env.JWT_SECRET!, { expiresIn: '3h' });
};
