// src/modules/auth/controllers/auth.controller.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';
import AuthService from '../services/auth.service';
import { registerSchema } from '../dtos/register.dto';
import { loginSchema, LoginDTO } from '../dtos/login.dto';
import { resetPasswordSchema, ResetPasswordDTO } from '../dtos/resetPassword.dto';
import { verifyEmailVerificationToken } from '../../../utils/tokenUtils';
import AuthRepository from '../repositories/auth.repository';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { updateProfileSchema, UpdateProfileDTO } from '../dtos/updateProfile.dto';
import { 
    AUTH_CONFIG, 
    getAccessTokenCookieConfig, 
    getRefreshTokenCookieConfig 
} from '../../../config/auth.config';

const isProduction = process.env.NODE_ENV === 'production'; 

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
      const validatedData: LoginDTO = await loginSchema.validateAsync(req.body);

      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      console.log(`🔍 Login Attempt: Email=${validatedData.email}, IP=${clientInfo.ip}`);

      const { user, accessToken, refreshToken } = await AuthService.loginUser(validatedData, clientInfo);

      // Access token cookie (15 dakika)
      res.cookie('access_token', accessToken, getAccessTokenCookieConfig(isProduction));

      // Refresh token cookie (30 gün)
      res.cookie('refresh_token', refreshToken, getRefreshTokenCookieConfig(isProduction));

      res.json({
          success: true,
          message: 'Login successful',
          data: {
              user: {
                  _id: user._id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  isActive: user.isActive, 
              },
              // Frontend için token expiry bilgisi
              expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_MS,
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
/**
 * Access Token Yenileme (Refresh)
 * Enterprise: Sliding window + Token rotation
 */
export const refreshAccessToken: RequestHandler = async (req, res, next): Promise<void> => {
  try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
          res.status(401).json({ success: false, message: 'Unauthorized: No refresh token' });
          return;
      }

      const clientInfo = {
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
      };

      const { accessToken, refreshToken: newRefreshToken } =
          await AuthService.refreshAccessToken(refreshToken, clientInfo);

      // Yeni refresh token cookie (sliding window: 30 gün daha)
      if (newRefreshToken) {
          res.cookie('refresh_token', newRefreshToken, getRefreshTokenCookieConfig(isProduction));
      }

      // Yeni access token cookie (15 dakika)
      res.cookie('access_token', accessToken, getAccessTokenCookieConfig(isProduction));

      res.json({
          success: true,
          message: 'Access token refreshed',
          data: {
              expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_MS,
          }
      });
  } catch (err) {
      console.error('❌ Refresh Token Error:', err);
      // Cookie'leri temizle
      res.clearCookie('refresh_token', { path: '/' });
      res.clearCookie('access_token', { path: '/' });
      res.status(401).json({ success: false, message: 'Unauthorized: Session expired' });
  }
};


/**
 * Şifre Sıfırlama İsteği
 */
export const requestPasswordReset: RequestHandler = async (req, res, next) => {
    try {
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

/**
 * Oturum Açmış Kullanıcı Bilgilerini Getirme (GET /api/profile/me)
 * @requires authenticate Middleware (req.user'ı sağlar)
 */
export const getMe: RequestHandler = async (req, res, next) => {
    try {
        // req.user, authenticate middleware'i tarafından set edilmiştir.
        // req.user'ın tipinin doğru olduğundan emin olmak için req objesinde genişletilmiş User tipini varsayıyoruz.
        const userId = req.user?.id; 

        if (!userId) {
            throw new AppError('Kullanıcı doğrulanamadı', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 1) Service'ten kullanıcıyı ID ile çek
        const user = await AuthService.getProfileById(userId); 

        if (!user) {
             throw new AppError('Kullanıcı bulunamadı', ErrorCodes.NOT_FOUND, 404);
        }

        // 2) HTTP 200 (OK) yanıtı dön
        // Frontend'in beklediği temel profil verilerini döndürüyoruz.
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role, // Kritik rol bilgisi
                isActive: user.isActive, 
                // ... (Diğer gerekli alanlar eklenebilir)
            },
        });

    } catch (err: any) {
        next(err); 
    }
};