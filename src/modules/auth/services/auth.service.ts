// src/modules/auth/services/auth.service.ts

import AuthRepository from '../repositories/auth.repository';
import { RegisterDTO } from '../dtos/register.dto';
import { IUser } from '../models/user.model';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { generateEmailVerificationToken } from '../../../utils/tokenUtils';
import { sendVerificationEmail } from '../../../utils/emailUtils';
import { generateAccessToken, generateRefreshToken } from '../../../utils/tokenUtils'; // Örneğin
import bcrypt from 'bcrypt';
import { LoginDTO } from '../dtos/login.dto';
import TokenRepository from '../repositories/token.repository';
import { generatePasswordResetToken } from '../../../utils/tokenUtils';
import { sendPasswordResetEmail } from '../../../utils/emailUtils';
import jwt from 'jsonwebtoken';

class AuthService {
    /**
     * Kullanıcı kaydı (Register)
     */
    public async registerUser(data: RegisterDTO): Promise<IUser> {
        // 1) Aynı email var mı kontrol et
        const existingUser = await AuthRepository.findByEmail(data.email);
        if (existingUser) {
            throw new AppError('Email already in use', ErrorCodes.EMAIL_IN_USE, 400);
        }

        // 2) Kullanıcı oluştur
        const user = await AuthRepository.createUser({
            ...data,
            role: data.role || 'user',
            emailVerified: false,
        });

        // 3) Token üret ve email gönder
        const token = generateEmailVerificationToken(user._id.toString());
        await sendVerificationEmail(user.email, token);

        return user;
    }

    public async loginUser(data: LoginDTO, clientInfo: { ip: string, userAgent: string }) {
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
            console.log(`Yeni Failed Attempts: ${user.failedLoginAttempts}`);
            throw new AppError('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS, 401);
        }
    
        // 3) Email doğrulama
        if (!user.emailVerified) {
            const verificationToken = generateEmailVerificationToken(user._id.toString());
            await sendVerificationEmail(user.email, verificationToken);
            throw new AppError('Email is not verified. A new verification email has been sent.', ErrorCodes.FORBIDDEN, 403);
        }
    
        // 4) Hesap kilidi kontrolü
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            throw new AppError('Account locked', ErrorCodes.ACCOUNT_LOCKED, 403);
        }
    
        // 5) Kullanıcı giriş yaptığında eski refresh token'ları iptal et
        await TokenRepository.revokeAllTokens(user._id.toString());
    
        // 6) Kullanıcı giriş yaptığında `tokenVersion` artır
        user.tokenVersion += 1;
        user.lastLoginAt = new Date(); // ✅ Son giriş tarihi güncellendi
        await user.save();
    
        // 7) Yeni Access ve Refresh Token oluştur
        const accessToken = generateAccessToken(user._id.toString(), user.role);
        const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);
    
        // 8) Refresh Token’ı DB’ye kaydet ve eski token sayısını sınırla
        await TokenRepository.createRefreshToken(user._id.toString(), refreshToken, clientInfo);
        await TokenRepository.enforceTokenLimit(user._id.toString()); // ✅ Token sayısı sınırlandırıldı
    
        return { user, accessToken, refreshToken };
    }
    
    
    /**
     * Refresh token kullanarak yeni access token oluşturma
     */
    public async refreshAccessToken(refreshToken: string, clientInfo: { ip: string, userAgent: string }) {
        let decoded: any;

        try {
            const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
            const user = await AuthRepository.findById(decoded.userId);
    
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }
    
            if (user.tokenVersion !== decoded.version) {
                throw new Error('Refresh token is invalid due to version mismatch');
            }
    
            const existingToken = await TokenRepository.findRefreshToken(refreshToken);
            if (!existingToken) {
                // 🚨 Token geçersizse hemen sil ve kullanıcıya zorunlu giriş yaptır
                await TokenRepository.revokeAllTokens(user._id.toString());
                throw new Error('Invalid refresh token');
            }
    
            if (existingToken.ip !== clientInfo.ip || existingToken.userAgent !== clientInfo.userAgent) {
                console.warn(`🚨 Şüpheli giriş tespit edildi! IP: ${clientInfo.ip}`);
                await AuthRepository.flagSuspiciousActivity(user._id.toString(), clientInfo.ip);
                await TokenRepository.revokeAllTokens(user._id.toString());
                throw new Error('Suspicious refresh token detected');
            }
    
            // ✅ Refresh Token son kullanım tarihini güncelle
            await TokenRepository.updateLastUsed(refreshToken);
    
            const newAccessToken = generateAccessToken(user._id.toString(), user.role);
            const newRefreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);
    
            await TokenRepository.replaceRefreshToken(user._id.toString(), refreshToken, newRefreshToken, clientInfo);
    
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            console.error('Refresh Token Hatası:', error);
            await TokenRepository.revokeAllTokens(decoded?.userId);
            throw new Error('Invalid refresh token');
        }
    }
    
    
    /**
    * Şifre sıfırlama tokeni oluştur ve e-posta gönder.
    */
    public async requestPasswordReset(email: string) {
        const user = await AuthRepository.findByEmail(email);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        // Yeni şifre sıfırlama tokeni oluştur
        const { token, expires } = generatePasswordResetToken();
        user.passwordResetToken = token;
        user.passwordResetExpires = expires;
        await user.save();

        // Kullanıcıya e-posta gönder
        await sendPasswordResetEmail(user.email, token);

        return { success: true, message: 'Password reset email sent' };
    }
    public async logoutUser(refreshToken: string): Promise<void> {
        try {
            // 1) Veritabanındaki refresh token'ı iptal et
            await TokenRepository.revokeToken(refreshToken);
            console.log(`Refresh token revoked successfully: ${refreshToken}`);
        } catch (error) {
            console.error(`Error revoking refresh token: ${refreshToken}`, error);
            throw new Error('Failed to logout user');
        }
    }

    /**
     * Kullanıcının şifresini sıfırla
     */
    public async resetPassword(token: string, newPassword: string) {
        const user = await AuthRepository.findByResetToken(token);
        if (!user || user.passwordResetExpires! < new Date()) {
            throw new AppError('Invalid or expired token', ErrorCodes.TOKEN_INVALID, 400);
        }

        // Yeni şifreyi ata
        user.password = newPassword;
        await user.clearPasswordResetToken();

        return { success: true, message: 'Password reset successful' };
    }

}

export default new AuthService();

/**
 * Örnek: Kullanıcı kaydı (registerUser) metodu
 *        Zaten yaptığımızı varsayıyoruz.
 */
// public async registerUser( ... ) { ... }
