// src/modules/auth/services/auth.service.ts

import AuthRepository from '../repositories/auth.repository';
import { RegisterDTO } from '../dtos/register.dto';
import { IUser } from '../models/user.model';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { generateEmailVerificationToken } from '../../../utils/tokenUtils';
import { sendVerificationEmail } from '../../../utils/emailUtils';
import { 
    generateAccessToken, 
    generateRefreshToken, 
    decodeRefreshToken,
    isAbsoluteExpired 
} from '../../../utils/tokenUtils';
import bcrypt from 'bcrypt';
import { LoginDTO } from '../dtos/login.dto';
import TokenRepository from '../repositories/token.repository';
import { generatePasswordResetToken } from '../../../utils/tokenUtils';
import { sendPasswordResetEmail } from '../../../utils/emailUtils';
import TokenModel from '../models/token.model';
import { UpdateProfileDTO } from '../dtos/updateProfile.dto';
import { AUTH_CONFIG } from '../../../config/auth.config';

interface ClientInfo {
    ip: string;
    userAgent: string;
    deviceFingerprint?: string;
}

class AuthService {
    
    /**
     * Kullanıcıyı ID'ye göre getirir ve hassas alanları hariç tutar.
     */
    public async getProfileById(userId: string): Promise<IUser | null> {
        const user = await AuthRepository.findById(userId, { 
            select: '-password' 
        });
        return user;
    }

    /**
     * Kullanıcı kaydı (Register)
     */
    public async registerUser(data: RegisterDTO): Promise<IUser> {
        const existingUser = await AuthRepository.findByEmail(data.email);
        if (existingUser) {
            throw new AppError('Email already in use', ErrorCodes.EMAIL_IN_USE, 400);
        }

        const user = await AuthRepository.createUser({
            ...data,
            role: data.role || 'user',
            emailVerified: false,
        });

        const token = generateEmailVerificationToken(user._id.toString());
        await sendVerificationEmail(user.email, token);

        return user;
    }

    /**
     * Kullanıcı girişi (Login)
     * Enterprise: Sliding window refresh token + Absolute max session
     */
    public async loginUser(data: LoginDTO, clientInfo: ClientInfo) {
        const { email, password } = data;

        // 1) Kullanıcı var mı?
        const user = await AuthRepository.findByEmail(email);
        if (!user) {
            throw new AppError('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS, 401);
        }

        // 2) Şifre karşılaştırma
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await user.incrementFailedLogins();
            throw new AppError('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS, 401);
        }

        // 3) Email doğrulama
        if (!user.emailVerified) {
            const verificationToken = generateEmailVerificationToken(user._id.toString());
            await sendVerificationEmail(user.email, verificationToken);
            throw new AppError('Email is not verified.', ErrorCodes.FORBIDDEN, 403);
        }

        // 4) Hesap kilidi kontrolü
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            throw new AppError('Account locked', ErrorCodes.ACCOUNT_LOCKED, 403);
        }

        try {
            // 5) Token version artır
            user.tokenVersion += 1;
            user.lastLoginAt = new Date();
            await user.updateLastLogin(clientInfo.ip);
            await user.save();

            // 6) Yeni Access ve Refresh Token oluştur
            const accessToken = generateAccessToken(user._id.toString(), user.role);
            const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);
            
            // Decode refresh token to get sessionId and absoluteExp
            const decoded = decodeRefreshToken(refreshToken);

            // 7) Refresh Token'ı DB'ye kaydet
            await TokenRepository.createRefreshToken(
                user._id.toString(), 
                refreshToken, 
                decoded.sessionId,
                decoded.absoluteExp,
                clientInfo
            );
            
            // 8) Cihaz limitini uygula (max 5 aktif oturum)
            await TokenRepository.enforceTokenLimit(user._id.toString());

            console.log(`✅ Login successful: User=${user.email}, Session=${decoded.sessionId}`);

            return { user, accessToken, refreshToken };
        } catch (err) {
            console.error('❌ Login error:', err);
            throw new AppError('Login işlemi başarısız oldu', ErrorCodes.SERVER_ERROR, 500);
        }
    }

    /**
     * Kullanıcı çıkışı (Logout)
     */
    public async logoutUser(refreshToken: string): Promise<void> {
        try {
            await TokenRepository.revokeToken(TokenRepository.hashToken(refreshToken));
            console.log(`✅ Refresh token revoked successfully.`);
        } catch (error) {
            console.error(`❌ Error revoking refresh token`, error);
            throw new AppError('Failed to revoke refresh token', ErrorCodes.SERVER_ERROR, 500);
        }
    }

    /**
     * Refresh token kullanarak yeni access token oluşturma
     * Enterprise: Sliding window (her refresh'te 30 gün uzar) + Absolute max (90 gün)
     */
    public async refreshAccessToken(refreshToken: string, clientInfo: ClientInfo) {
        let decoded;

        try {
            // 1) Token decode et
            decoded = decodeRefreshToken(refreshToken);
        } catch (error) {
            throw new AppError('Invalid refresh token', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 2) Absolute expiry kontrolü (90 gün)
        if (isAbsoluteExpired(decoded.absoluteExp)) {
            console.warn(`🚨 Absolute session limit (90 days) exceeded for user: ${decoded.userId}`);
            await TokenRepository.revokeBySessionId(decoded.sessionId);
            throw new AppError('Session expired. Please log in again.', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 3) Kullanıcı kontrolü
        const user = await AuthRepository.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 4) Token version kontrolü
        if (user.tokenVersion !== decoded.version) {
            console.warn(`🚨 Token version mismatch for user: ${decoded.userId}`);
            await TokenRepository.revokeBySessionId(decoded.sessionId);
            throw new AppError('Session invalidated. Please log in again.', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 5) DB'de token kontrolü (idle timeout, sliding expiry dahil)
        const existingToken = await TokenRepository.findRefreshToken(decoded.userId, refreshToken);
        if (!existingToken) {
            console.warn(`🚨 Refresh token not found or expired for user: ${decoded.userId}`);
            throw new AppError('Session expired. Please log in again.', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 6) Şüpheli aktivite kontrolü (farklı IP/UA)
        if (existingToken.ip !== clientInfo.ip || existingToken.userAgent !== clientInfo.userAgent) {
            console.warn(`🔄 Device change detected: User=${user._id}, OldIP=${existingToken.ip}, NewIP=${clientInfo.ip}`);
            
            // Şüpheli aktivite kontrolü
            const isSuspicious = await TokenRepository.detectSuspiciousActivity(
                decoded.userId, 
                clientInfo.ip, 
                clientInfo.userAgent
            );
            
            if (isSuspicious) {
                await AuthRepository.flagSuspiciousActivity(user._id.toString(), clientInfo.ip);
                await TokenRepository.revokeAllTokens(user._id.toString());
                throw new AppError('Suspicious activity detected. Please log in again.', ErrorCodes.UNAUTHORIZED, 401);
            }
        }

        try {
            // 7) Yeni Access Token oluştur (15 dk)
            const newAccessToken = generateAccessToken(user._id.toString(), user.role);
            
            // 8) Yeni Refresh Token oluştur (sliding window: 30 gün daha)
            // Aynı sessionId ve absoluteExp ile oluştur
            const newRefreshToken = generateRefreshToken(
                user._id.toString(), 
                user.tokenVersion,
                decoded.sessionId,
                decoded.absoluteExp
            );

            // 9) Token rotation: eski token'ı iptal et, yenisini ekle
            await TokenRepository.rotateRefreshToken(
                user._id.toString(),
                refreshToken,
                newRefreshToken,
                decoded.sessionId,
                decoded.absoluteExp,
                clientInfo
            );

            console.log(`🔄 Token refreshed: User=${user.email}, Session=${decoded.sessionId}`);

            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            console.error('❌ Refresh token error:', error);
            await TokenRepository.revokeBySessionId(decoded.sessionId);
            throw new AppError('Failed to refresh token', ErrorCodes.UNAUTHORIZED, 401);
        }
    }

    /**
     * Kullanıcının aktif oturumlarını getir
     */
    public async getActiveSessions(userId: string) {
        const sessions = await TokenRepository.getActiveSessions(userId);
        return sessions.map(session => ({
            sessionId: session.sessionId,
            deviceInfo: session.deviceInfo,
            ip: session.ip,
            userAgent: session.userAgent,
            lastActivityAt: session.lastActivityAt,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
        }));
    }

    /**
     * Belirli bir oturumu sonlandır
     */
    public async revokeSession(userId: string, sessionId: string): Promise<void> {
        await TokenRepository.revokeBySessionId(sessionId);
        console.log(`✅ Session revoked: User=${userId}, Session=${sessionId}`);
    }

    /**
     * Tüm oturumları sonlandır (şifre değişikliği, güvenlik ihlali vb.)
     */
    public async revokeAllSessions(userId: string): Promise<void> {
        await TokenRepository.revokeAllTokens(userId);
        console.log(`✅ All sessions revoked for user: ${userId}`);
    }

    /**
     * Şifre sıfırlama tokeni oluştur ve e-posta gönder.
     */
    public async requestPasswordReset(email: string) {
        const user = await AuthRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        const { token, expires } = generatePasswordResetToken();
        user.passwordResetToken = token;
        user.passwordResetExpires = expires;
        await user.save();

        await sendPasswordResetEmail(user.email, token);

        return { success: true, message: 'Password reset email sent' };
    }

    /**
     * Kullanıcının şifresini sıfırla
     */
    public async resetPassword(token: string, newPassword: string) {
        const user = await AuthRepository.findByResetToken(token);
        if (!user || user.passwordResetExpires! < new Date()) {
            throw new AppError('Invalid or expired token', ErrorCodes.TOKEN_INVALID, 400);
        }

        user.password = newPassword;
        await user.clearPasswordResetToken();

        // Şifre değiştiğinde tüm oturumları sonlandır
        await TokenRepository.revokeAllTokens(user._id.toString());

        return { success: true, message: 'Password reset successful' };
    }

    /**
     * Kullanıcı profili güncelle
     */
    public async updateUserProfile(userId: string, data: UpdateProfileDTO): Promise<IUser> {
        const updatedUser = await AuthRepository.updateUser(userId, data);
        
        if (!updatedUser) {
            throw new AppError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND, 404);
        }

        return updatedUser;
    }
}

export default new AuthService();
