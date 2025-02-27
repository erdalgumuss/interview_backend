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
// Login Controller
export const login: RequestHandler = async (req, res, next) => {
  try {
      const validatedData: LoginDTO = await loginSchema.validateAsync(req.body);

      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      console.log(`🔍 Login Attempt: Email=${validatedData.email}, IP=${clientInfo.ip}, User-Agent=${clientInfo.userAgent}`);

      const { user, accessToken, refreshToken } = await AuthService.loginUser(validatedData, clientInfo);

      // Access tokenı cookie olarak ayarla (örneğin 10 dakika)
      res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 10  * 100, // 10 dakika
          path: '/',
      });

      // Refresh tokenı cookie olarak ayarla (örneğin 7 gün)
      res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
          path: '/',
      });

      res.json({
          success: true,
          message: 'Login successful',
          data: {
              user: {
                  _id: user._id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
              }
          },
      });
  } catch (err) {
      console.error('❌ Login Error:', err);
      next(err);
  }
};


  
  // Logout Controller
// Logout Controller
export const logout: RequestHandler = async (req, res, next): Promise<void> => {
  try {
      // 1) Refresh token'ı cookie'den al
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
          console.warn('⚠ No refresh token provided.');
         res.status(204).send();
      }

      // 2) Kullanıcının tüm refresh tokenlarını iptal et
      await AuthService.logoutUser(refreshToken);

      // 3) Tüm oturumla ilgili cookieleri temizle
      res.clearCookie('refresh_token', { path: '/' });
      res.clearCookie('access_token', { path: '/' });

      console.log('✅ Logout successful.');

      // 4) 204 No Content Yanıtı Dön
      res.status(204).send();
  } catch (err) {
      console.error('❌ Logout Error:', err);
      next(err);
  }
};



  // Refresh Access Token Controller



// Refresh Access Token Controller
// Refresh Access Token Controller
export const refreshAccessToken: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    console.log("🔑 trya girdi controlcülde");
      // 1) Refresh token'ı cookie'den al
      const refreshToken = req.cookies.refresh_token;
      console.log("🔑 refreshToken", refreshToken);
      if (!refreshToken) {
          console.warn('⚠ No refresh token provided.');
          res.status(401).json({ success: false, message: 'Unauthorized: No refresh token' });
          return;
      }

      // 2) Client bilgilerini al
      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      console.log(`🔄 Refresh Token Attempt: IP=${clientInfo.ip}, User-Agent=${clientInfo.userAgent}`);

      // 3) Yeni access token ve refresh token oluştur
      const { accessToken, refreshToken: newRefreshToken } =
          await AuthService.refreshAccessToken(refreshToken, clientInfo);

      // 4) Yeni refresh token varsa cookie'yi güncelle
      if (newRefreshToken) {
          res.cookie('refresh_token', newRefreshToken, {
              httpOnly: true,
              secure: process.env.COOKIE_SECURE === 'true',
              sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
              path: '/',
          });
      }

      // ✅ Yeni access token'ı da cookie olarak ayarla (10 dakika geçerli)
      res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 10 * 60 * 1000, // 10 dakika
          path: '/',
      });

      // 5) Yeni access token'ı response body'de döndür
      res.json({
          success: true,
          message: 'Access token refreshed',
      });
  } catch (err) {
      console.error('❌ Refresh Token Error:', err);
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





