// src/modules/auth/services/profile.service.ts

import AuthRepository from '../repositories/auth.repository';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { IUser } from '../models/user.model';
import bcrypt from 'bcrypt';

class ProfileService {
    /**
     * Kullanıcı profilini güncelle
     */
    public async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
        const user = await AuthRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        // Güncellenecek alanları belirle
        if (updateData.name) user.name = updateData.name;
        if (updateData.email) user.email = updateData.email;
        if (updateData.phone) user.phone = updateData.phone;
        if (updateData.bio) user.bio = updateData.bio;
        if (updateData.profilePicture) user.profilePicture = updateData.profilePicture;

        await user.save();

        return user;
    }
    /**
 * Kullanıcının kendi profilini getirir
 */
    public async getProfile(userId: string): Promise<IUser> {
        const user = await AuthRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }
        return user;
    }
    /**
 * Kullanıcı şifresini değiştirir (mevcut şifre doğrulaması yaparak)
 */
    public async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<IUser> {
        const user = await AuthRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        // 1) Mevcut şifre doğru mu?
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new AppError('Old password is incorrect', ErrorCodes.UNAUTHORIZED, 401);
        }

        // 2) Yeni şifreyi ata (User modelindeki pre-save hook bu şifreyi hash'leyecek)
        user.password = newPassword;
        await user.save();

        return user;
    }

    /**
    * Kullanıcının profil resmini günceller
    */
    public async updateProfilePicture(userId: string, s3Url: string): Promise<IUser> {
        const user = await AuthRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', ErrorCodes.NOT_FOUND, 404);
        }

        user.profilePicture = s3Url;
        await user.save();

        return user;
    }
}

export default new ProfileService();
