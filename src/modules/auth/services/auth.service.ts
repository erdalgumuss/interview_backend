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
    
        // 5) Kullanıcı giriş yaptığında eski refresh token'ları iptal et
        await TokenRepository.revokeAllTokens(user._id.toString());
    
        // 6) Kullanıcı giriş yaptığında `tokenVersion` artır
        user.tokenVersion += 1;
        user.lastLoginAt = new Date();
        await user.save();
    
        // 7) Yeni Access ve Refresh Token oluştur
        const accessToken = generateAccessToken(user._id.toString(), user.role);
        const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);
    
        // 8) Refresh Token’ı DB’ye kaydet ve eski tokenları sınırla
        await TokenRepository.createRefreshToken(user._id.toString(), refreshToken, clientInfo);
        await TokenRepository.enforceTokenLimit(user._id.toString()); 
    
        // ✅ Refresh token son kullanımı güncelle
        await TokenRepository.updateLastUsed(refreshToken);
    
        return { user, accessToken, refreshToken };
    }
    
    
    
    /**
     * Refresh token kullanarak yeni access token oluşturma
     */
    public async refreshAccessToken(refreshToken: string, clientInfo: { ip: string, userAgent: string }) {
        let decoded: any;
    
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
            const user = await AuthRepository.findById(decoded.userId);
    
            if (!user || !user.isActive) {
                throw new AppError('User not found or inactive', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            if (user.tokenVersion !== decoded.version) {
                throw new AppError('Refresh token is invalid due to version mismatch', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            const existingToken = await TokenRepository.findRefreshToken(decoded.userId, refreshToken);
            if (!existingToken) {
                await TokenRepository.revokeAllTokens(user._id.toString());
                throw new AppError('Invalid refresh token', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            if (existingToken.ip !== clientInfo.ip || existingToken.userAgent !== clientInfo.userAgent) {
                await AuthRepository.flagSuspiciousActivity(user._id.toString(), clientInfo.ip);
                await TokenRepository.revokeAllTokens(user._id.toString());
                throw new AppError('Suspicious refresh token detected', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            await TokenRepository.updateLastUsed(refreshToken);
            const newAccessToken = generateAccessToken(user._id.toString(), user.role);
            const newRefreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);
    
            await TokenRepository.replaceRefreshToken(user._id.toString(), refreshToken, newRefreshToken, clientInfo);
    
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            await TokenRepository.revokeAllTokens(decoded?.userId);
            throw new AppError('Invalid refresh token', ErrorCodes.UNAUTHORIZED, 401);
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
