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
import { profile } from 'console';

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


// Login Controller
export const login: RequestHandler = async (req, res, next) => {
    try {
      // 1) Request body validasyonu
      const validatedData: LoginDTO = await loginSchema.validateAsync(req.body);
  
      // 2) Client bilgilerini al (IP ve User-Agent)
      const clientInfo = {
        ip:
          req.headers['x-forwarded-for']?.toString().split(',')[0] ||
          req.ip ||
          'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
      };
  
      // 3) Kullanıcı giriş işlemini gerçekleştir
      const { user, accessToken, refreshToken } =
        await AuthService.loginUser(validatedData, clientInfo);
  
      // 4) Refresh token'ı HttpOnly cookie olarak set et (güvenlik için)
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
        path: '/',
      });
  
      // 5) Access token'ı response body'de döndür (frontend, bunu Authorization Bearer header olarak kullanacak)
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
          },
          accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Logout Controller
  export const logout: RequestHandler = async (req, res, next) => {
    try {
      // 1) Refresh token'ı cookie'den al
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'No refresh token provided' });
        return;
      }
  
      // 2) Logout servisini çağır (backend tüm refresh token'ları iptal edecek)
      await AuthService.logoutUser(refreshToken);
  
      // 3) Refresh token cookie'sini temizle
      res.clearCookie('refresh_token', { path: '/' });
  
      res.json({ success: true, message: 'Successfully logged out' });
    } catch (err) {
      next(err);
    }
  };
  
  // Refresh Access Token Controller



// Refresh Access Token Controller
export const refreshAccessToken: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      // 1) Refresh token'ı cookie'den al
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Unauthorized: No refresh token' });
        return;
      }
  
      // 2) Client bilgilerini al
      const clientInfo = {
        ip:
          req.headers['x-forwarded-for']?.toString().split(',')[0] ||
          req.ip ||
          'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
      };
  
      // 3) AuthService.refreshAccessToken çağrısını yap
      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService.refreshAccessToken(refreshToken, clientInfo);
  
      // 4) Yeni refresh token varsa cookie'yi güncelle
      if (newRefreshToken) {
        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
          path: '/',
        });
      }
  
      // 5) Yeni access token'ı response body'de döndür
      res.json({
        success: true,
        message: 'Access token refreshed',
        data: { accessToken },
      });
    } catch (err) {
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid refresh token' });
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





