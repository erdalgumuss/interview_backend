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

    /**
    * Login (Kullanıcı girişi)
    */
    public async loginUser(data: LoginDTO) {
        const { email, password } = data;

        // 1) Kullanıcı var mı
        const user = await AuthRepository.findByEmail(email);
        if (!user) {
            throw new AppError('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS, 401);
        }

        // 2) Şifre karşılaştırma
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Hatalı giriş, failedLoginAttempts++ yapılabilir (isteğe bağlı)
            await user.incrementFailedLogins();
            console.log(`Yeni Failed Attempts: ${user.failedLoginAttempts}`);
            throw new AppError('Invalid credentials', ErrorCodes.INVALID_CREDENTIALS, 401);
        }

        // 3) Email doğrulama
        // 3) Kullanıcı e-posta doğrulamasını yapmamışsa otomatik tekrar mail gönder
        if (!user.emailVerified) {
            const verificationToken = generateEmailVerificationToken(user._id.toString());
            await sendVerificationEmail(user.email, verificationToken);

            throw new AppError(
                'Email is not verified. A new verification email has been sent.',
                ErrorCodes.FORBIDDEN,
                403
            );
        }

        // 4) Hesap kilidi kontrolü
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            throw new AppError('Account locked', ErrorCodes.ACCOUNT_LOCKED, 403);
        }

        // 5) Giriş başarılı, failedLoginAttempts sıfırla
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = undefined;
        await user.save();

        // 6) Token oluştur
        const accessToken = generateAccessToken(user._id.toString(), user.role);
        const refreshToken = generateRefreshToken({ userId: user._id });
        // 6) Refresh Token'ı veritabanına kaydet
        await TokenRepository.createRefreshToken(user._id.toString(), refreshToken, 7 * 24 * 60 * 60 * 1000);

        // 7) User objesi döndürürken hassas alanları filtreleyebilirsiniz
        //    Şimdilik user.toJSON() ile password, tokens vs. remove edilebilir (model'e set('toJSON',...) tanımlıysa)
        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh token kullanarak yeni access token oluşturma
     */
    public async refreshAccessToken(refreshToken: string) {
        const existingToken = await TokenRepository.findRefreshToken(refreshToken);
        if (!existingToken) {
            throw new AppError('Invalid refresh token', ErrorCodes.UNAUTHORIZED, 401);
        }

        // Yeni Access Token üret
        const user = await AuthRepository.findById(existingToken.user.toString());
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }
        const newAccessToken = generateAccessToken(user._id.toString(), user.role);

        return { accessToken: newAccessToken };
    }
    /**
     * Kullanıcı çıkış işlemi
     */
    public async logoutUser(refreshToken: string) {
        await TokenRepository.revokeToken(refreshToken);
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
