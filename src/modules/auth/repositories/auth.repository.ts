// src/modules/auth/repositories/auth.repository.ts

import UserModel, { IUser } from '../models/user.model';
import { RegisterDTO } from '../dtos/register.dto';

export class AuthRepository {
    /**
     * Kullanıcı kaydı oluşturma
     */
    async createUser(data: RegisterDTO): Promise<IUser> {
        const newUser = new UserModel(data);
        return newUser.save() as Promise<IUser>; // Explicit casting
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
     * 🔹 Şifre sıfırlama token'ına göre kullanıcıyı bulma
     */
       async findByResetToken(token: string): Promise<IUser | null> {
        return UserModel.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }, // Token süresi dolmamış olmalı
        });
    }
}

export default new AuthRepository();
