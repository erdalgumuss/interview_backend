import UserModel, { IUser } from '../models/user.model';
import { RegisterDTO } from '../dtos/register.dto';
import { UpdateProfileDTO } from '../dtos/updateProfile.dto';
import { QueryOptions } from 'mongoose'; // Mongoose QueryOptions tipini varsayıyoruz

type CreateUserInput = RegisterDTO & Partial<IUser>; 

class AuthRepository {
    /**
     * Kullanıcı kaydı oluşturma
     */
    async createUser(data: CreateUserInput): Promise<IUser> {
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
     * Kullanıcıyı ID ile bulma (Ekstra Sorgu Seçeneklerini Kabul Eder)
     */
    async findById(userId: string, options?: QueryOptions): Promise<IUser | null> {
        // options (seçenekler) argümanını findById'nin ikinci parametresi olarak geçiriyoruz.
        // Bu, Service katmanından hassas alanları hariç tutma (select: '-password') gibi istekleri karşılar.
        return UserModel.findById(userId, undefined, options); 
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
    /**
     * Kullanıcı profil bilgilerini günceller.
     */
    async updateUser(userId: string, data: UpdateProfileDTO): Promise<IUser | null> {
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true } // Yeni güncellenmiş belgeyi döndür
        ).select('-password'); // Şifreyi yanıt dışında tut

        return updatedUser;
    }
}

export default new AuthRepository();
