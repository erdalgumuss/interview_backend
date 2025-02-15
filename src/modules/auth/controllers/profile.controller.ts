// src/modules/auth/controllers/profile.controller.ts

import { Request, Response, NextFunction } from 'express';
import ProfileService from '../services/profile.service';
import { updateProfileSchema } from '../dtos/updateProfile.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { changePasswordSchema } from '../dtos/changePassword.dto';
import { uploadFileToS3 } from '../../../utils/awsS3Utils';

/**
 * Kullanıcı profilini güncelle
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 1) Gelen veriyi doğrula
        const validatedData = await updateProfileSchema.validateAsync(req.body);

        // 2) Servis katmanına yönlendir
        const updatedUser = await ProfileService.updateProfile(userId, validatedData);

        // 3) Başarı cevabı gönder
        res.json({
            success: true,
            data: {
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                bio: updatedUser.bio,
                profilePicture: updatedUser.profilePicture,
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Kullanıcı kendi profilini görüntüler
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id; // authenticate middleware'den geldi
        if (!userId) {
            throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
        }

        const user = await ProfileService.getProfile(userId);

        // Hassas alanları (password, ...) filtreliyoruz
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                bio: user.bio,
                profilePicture: user.profilePicture,
                // rol, izin, vs...
                role: user.role,
                permissions: user.permissions,
            },
        });
    } catch (err) {
        next(err);
    }
}
/**
 * Kullanıcı şifresini değiştirir
 */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 1) Validasyon (Joi)
        const { oldPassword, newPassword } = await changePasswordSchema.validateAsync(req.body);

        // 2) Service katmanına gönder
        const updatedUser = await ProfileService.changePassword(userId, oldPassword, newPassword);

        // 3) Başarılı yanıt
        res.json({
            success: true,
            message: 'Password changed successfully',
        });

    } catch (err) {
        next(err);
    }
}
/**
 * Profil resmini yükler ve S3 URL'sini user.profilePicture'a kaydeder.
 */
export async function uploadProfilePicture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', ErrorCodes.BAD_REQUEST, 400);
    }

    // 1) Dosya Buffer ve orijinal adı
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    // 2) S3'e yükle
    const s3Url = await uploadFileToS3(fileBuffer, originalName);

    // 3) User profilini güncelle
    const updatedUser = await ProfileService.updateProfilePicture(userId, s3Url);

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (err) {
    next(err);
  }
}