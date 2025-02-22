// src/modules/auth/controllers/auth.controller.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';
import AuthService from '../services/auth.service';
import { registerSchema } from '../validators/register.validator'; // opsiyonel
import { verifyEmailVerificationToken } from '../../../utils/tokenUtils';
import AuthRepository from '../repositories/auth.repository';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { loginSchema } from '../validators/login.validator';
import { LoginDTO } from '../dtos/login.dto';

export const register: RequestHandler = async (req, res, next) => {
    try {
        // 1) Validasyon
        const validatedData = await registerSchema.validateAsync(req.body);

        // 2) Service katmanını çağır
        const newUser = await AuthService.registerUser(req.body);

        // 3) HTTP 201 (Created) ve yeni kullanıcı bilgisi
        res.status(201).json({
            success: true,
            data: newUser,
        });
    } catch (err: any) {
        next(err); // error middleware'e gönder
    }
};
// src/modules/auth/controllers/auth.controller.ts


/**
 * Kullanıcı e-posta doğrulama
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { token } = req.query;

        if (!token) {
            throw new AppError('Invalid verification token', ErrorCodes.TOKEN_INVALID, 400);
        }

        // 1) Token'ı çözümle
        const { userId } = verifyEmailVerificationToken(token as string);

        // 2) Kullanıcıyı bul
        const user = await AuthRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        // 3) Kullanıcıyı güncelle
        user.emailVerified = true;
        await user.save();

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
        next(err);
    }
}

export const login: RequestHandler = async (req, res, next) => {
    try {
        // 1) Body validasyon (Joi)
        const validatedData: LoginDTO = await loginSchema.validateAsync(req.body);

        // 2) Kullanıcıyı doğrula (Service çağrısı)
        const { user, accessToken, refreshToken } = await AuthService.loginUser(validatedData);

        // 3) Access Token'ı HttpOnly Cookie'de sakla (XSS saldırılarına karşı koruma)
        res.cookie('access_token', accessToken, {
            httpOnly: true,            // JavaScript erişemez
            secure: process.env.NODE_ENV === 'production',  // Prod ortamında HTTPS gereksinimi
            sameSite: 'strict',        // CSRF koruması
            maxAge: 15 * 60 * 1000,    // 15 dakika süre (milisaniye)
            path: '/',                 // Tüm alt dizinlerde geçerli
        });
        
        // 4) Refresh Token'ı da HttpOnly Cookie'de sakla
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 gün süre (milisaniye)
            path: '/',  // Tüm alt dizinlerde geçerli
        });

        // 5) Kullanıcı bilgisi dön (Hassas verileri silerek)
        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });

    } catch (err) {
        next(err);
    }
};
export const logout: RequestHandler = async (req, res, next) => {
    try {
        // 1) Cookie'den refresh token al
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            res.status(400).json({ success: false, message: 'No refresh token provided' });
            return;
        }

        // 2) Veritabanında refresh token'ı iptal et
        await AuthService.logoutUser(refreshToken);

        // 3) Tarayıcıdaki cookieleri temizle
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });

        res.json({ success: true, message: 'Successfully logged out' });
    } catch (err) {
        next(err);
    }
};
export const refreshAccessToken: RequestHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            res.status(400).json({ success: false, message: 'No refresh token provided' });
            return;
        }

        const { accessToken } = await AuthService.refreshAccessToken(refreshToken);

        // Yeni Access Token'ı Cookie'ye ekle
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 dakika
            path: '/',
        });

        res.json({ success: true, message: 'Access token refreshed' });
    } catch (err) {
        next(err);
    }
};

export const requestPasswordReset: RequestHandler = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await AuthService.requestPasswordReset(email);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const result = await AuthService.resetPassword(token, newPassword);
        res.json(result);
    } catch (err) {
        next(err);
    }
};





