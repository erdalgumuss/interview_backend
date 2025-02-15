// src/modules/auth/repositories/token.repository.ts

import TokenModel, { IToken } from '../models/token.model';

class TokenRepository {
    /**
     * Kullanıcı için refresh token oluşturup kaydeder.
     */
    async createRefreshToken(userId: string, token: string, expiresIn: number): Promise<IToken> {
        const expiresAt = new Date(Date.now() + expiresIn); // Örn: 7 gün sonrası

        return await TokenModel.create({
            user: userId,
            token,
            expiresAt,
            type: 'refresh',
            isRevoked: false,
        });
    }

    /**
     * Kullanıcının refresh token’ını bul
     */
    async findRefreshToken(token: string): Promise<IToken | null> {
        return await TokenModel.findOne({ token, isRevoked: false });
    }

    /**
     * Kullanıcının tüm eski refresh tokenlarını iptal et
     */
    async revokeAllTokens(userId: string) {
        return await TokenModel.updateMany({ user: userId }, { isRevoked: true });
    }

    /**
     * Tek bir refresh token'ı iptal et
     */
    async revokeToken(token: string) {
        return await TokenModel.updateOne({ token }, { isRevoked: true });
    }
}

export default new TokenRepository();
