import UserModel, { IUser } from '../models/user.model';
import { RegisterDTO } from '../dtos/register.dto';

class AuthRepository {
    /**
     * Kullanıcı kaydı oluşturma
     */
    async createUser(data: RegisterDTO): Promise<IUser> {
        const newUser = new UserModel(data);
        return newUser.save();
    }

    /**
     * Email'e göre kullanıcı bulma
     */
    async findByEmail(email: string): Promise<IUser | null> {
        return UserModel.findOne({ email });
    }

    /**
     * Kullanıcıyı ID ile bulma
     */
    async findById(userId: string): Promise<IUser | null> {
        return UserModel.findById(userId);
    }

    /**
     * Şifre sıfırlama token'ına göre kullanıcıyı bulma
     */
    async findByResetToken(token: string): Promise<IUser | null> {
        return UserModel.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        });
    }

    /**
     * Son başarılı giriş zamanını güncelle
     */
    async updateLastLogin(userId: string, ip: string) {
        return await UserModel.updateOne({ _id: userId }, { lastLoginAt: new Date(), $push: { lastKnownIPs: ip } });
    }

    /**
     * Şüpheli girişleri kaydet
     */
    async logSuspiciousLogin(userId: string, ip: string, userAgent: string) {
        console.warn(`🚨 Şüpheli giriş: User=${userId}, IP=${ip}, User-Agent=${userAgent}`);
        return await UserModel.updateOne({ _id: userId }, { isActive: false });
    }
    async flagSuspiciousActivity(userId: string, ip: string) {
        return await UserModel.updateOne({ _id: userId }, { isActive: false, $push: { lastKnownIPs: ip } });
    }
}

export default new AuthRepository();
