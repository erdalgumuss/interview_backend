// src/modules/auth/controllers/auth.controller.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';
import AuthService from '../services/auth.service';
import { registerSchema } from '../dtos/register.dto';
import { loginSchema, LoginDTO } from '../dtos/login.dto'; // ✅ LoginDTO buradan import ediliyor
import { resetPasswordSchema, ResetPasswordDTO } from '../dtos/resetPassword.dto'; // ✅ ResetPasswordDTO ve şeması import edildi
import { verifyEmailVerificationToken } from '../../../utils/tokenUtils';
import AuthRepository from '../repositories/auth.repository';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { updateProfileSchema, UpdateProfileDTO } from '../dtos/updateProfile.dto'; 

/**
 * Kullanıcı Kaydı (Register)
 */
export const register: RequestHandler = async (req, res, next) => {
    try {
        // 1) Validasyon
        // RegisterDTO'yu doğrudan kullanmak için tip casting yapılabilir.
        const validatedData = await registerSchema.validateAsync(req.body);

        // 2) Service katmanını çağır
        const newUser = await AuthService.registerUser(validatedData);

        // 3) HTTP 201 (Created) ve yeni kullanıcı bilgisi (Token döndürülmüyor, e-posta doğrulama bekleniyor)
        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı. Lütfen e-posta adresinizi kontrol edin.',
            data: {
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                }
            },
        });
    } catch (err: any) {
        next(err); 
    }
};


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


/**
 * Kullanıcı Girişi (Login)
 */
export const login: RequestHandler = async (req, res, next) => {
  try {
      // 1) Validasyon (LoginDTO tipini kullandı)
      const validatedData: LoginDTO = await loginSchema.validateAsync(req.body);

      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      console.log(`🔍 Login Attempt: Email=${validatedData.email}, IP=${clientInfo.ip}, User-Agent=${clientInfo.userAgent}`);

      const { user, accessToken, refreshToken } = await AuthService.loginUser(validatedData, clientInfo);

      // Access tokenı cookie olarak ayarla (10 dakika)
      res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 10 * 60 * 1000, // ✅ DÜZELTİLDİ: 10 dakika milisaniye
          path: '/',
      });

      // Refresh tokenı cookie olarak ayarla (7 gün)
      res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, 
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
                  // Frontend'in beklediği isActive/status alanı eklenebilir
                  isActive: user.isActive, 
              }
          },
      });
  } catch (err) {
      console.error('❌ Login Error:', err);
      next(err);
  }
};


/**
 * Kullanıcı Çıkışı (Logout)
 */
export const logout: RequestHandler = async (req, res, next): Promise<void> => {
  try {
      // 1) Refresh token'ı cookie'den al
      const refreshToken = req.cookies?.refresh_token;
      
      // Token yoksa zaten çıkış yapılmıştır, cookieleri temizle ve 204 dön
      if (!refreshToken) {
         res.clearCookie('refresh_token', { path: '/' });
         res.clearCookie('access_token', { path: '/' });
         res.status(204).send();
         return; // 204 döndükten sonra dur
      }

      // 2) Token varsa, Service ile iptal et
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


/**
 * Access Token Yenileme (Refresh)
 */
export const refreshAccessToken: RequestHandler = async (req, res, next): Promise<void> => {
  try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
          // 401 döndürerek frontend'in login'e yönlendirmesini sağla
          res.status(401).json({ success: false, message: 'Unauthorized: No refresh token' });
          return;
      }

      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      const { accessToken, refreshToken: newRefreshToken } =
          await AuthService.refreshAccessToken(refreshToken, clientInfo);

      // 4) Yeni refresh token varsa cookie'yi güncelle
      if (newRefreshToken) {
          res.cookie('refresh_token', newRefreshToken, {
              httpOnly: true,
              secure: process.env.COOKIE_SECURE === 'true',
              sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
              maxAge: 7 * 24 * 60 * 60 * 1000, 
              path: '/',
          });
      }

      // Yeni access token'ı cookie olarak ayarla
      res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 10 * 60 * 1000, 
          path: '/',
      });

      res.json({
          success: true,
          message: 'Access token refreshed',
      });
  } catch (err) {
      console.error('❌ Refresh Token Error:', err);
      // Hata durumunda 401 dönmek en doğru yaklaşımdır.
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid refresh token' });
  }
};


/**
 * Şifre Sıfırlama İsteği
 */
export const requestPasswordReset: RequestHandler = async (req, res, next) => {
    try {
        // Burada da DTO kullanmak gerekir (requestPasswordReset.dto.ts oluşturulursa)
        const { email } = req.body;
        const result = await AuthService.requestPasswordReset(email);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Şifre Sıfırlama
 */
export const resetPassword: RequestHandler = async (req, res, next) => {
    try {
        // 1) Validasyon (ResetPasswordDTO kullanıldı)
        const validatedData: ResetPasswordDTO = await resetPasswordSchema.validateAsync(req.body);

        const result = await AuthService.resetPassword(validatedData.token, validatedData.newPassword);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Kullanıcı Profilini Güncelleme
 * @requires authenticate Middleware (req.user'ı sağlar)
 */
export const updateProfile: RequestHandler = async (req, res, next) => {
    try {
        // 1) DTO Validasyonu
        const validatedData: UpdateProfileDTO = await updateProfileSchema.validateAsync(req.body);
        
        // 2) Kullanıcı ID'si token'dan (authenticate middleware'inden) alınır
        const userId = req.user?.id; 
        
        if (!userId) {
            throw new AppError('Kullanıcı doğrulanamadı', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 3) Service katmanını çağır
        const updatedUser = await AuthService.updateUserProfile(userId, validatedData);

        // 4) HTTP 200 (OK) yanıtı dön
        res.status(200).json({
            success: true,
            message: 'Profil başarıyla güncellendi',
            data: updatedUser,
        });

    } catch (err: any) {
        next(err); // error middleware'e gönder
    }
};