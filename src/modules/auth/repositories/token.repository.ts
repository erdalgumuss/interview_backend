import crypto from 'crypto';
import TokenModel, { IToken } from '../models/token.model';

class TokenRepository {
    /**
     * Kullanıcı için refresh token oluşturup kaydeder.
     */
    async createRefreshToken(
        userId: string,
        token: string,
        clientInfo: { ip: string, userAgent: string, deviceInfo?: string }
    ) {
        const hashedToken = TokenRepository.hashToken(token);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün

        return await TokenModel.create({
            user: userId,
            token: hashedToken,
            expiresAt,
            type: 'refresh',
            isRevoked: false,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            deviceInfo: clientInfo.deviceInfo || 'Unknown Device',
            lastUsedAt: new Date(),
        });
    }

    /**
     * Refresh token'ı veritabanında bul (Hashed Token ile karşılaştırma yap)
     */
    async findRefreshToken(token: string): Promise<IToken | null> {
        const hashedToken = TokenRepository.hashToken(token);
        return await TokenModel.findOne({ token: hashedToken, isRevoked: false });
    }

    /**
     * Refresh Token'ın kullanım zamanını güncelle
     */
    async updateLastUsed(token: string) {
        const hashedToken = TokenRepository.hashToken(token);
        return await TokenModel.updateOne({ token: hashedToken }, { lastUsedAt: new Date() });
    }

    /**
     * Kullanıcının eski refresh tokenlarını iptal et (Logout, yeni giriş vb. durumlarda)
     */
    async revokeAllTokens(userId: string) {
        return await TokenModel.updateMany({ user: userId }, { isRevoked: true });
    }

    /**
     * Tek bir refresh token'ı iptal et
     */
    async revokeToken(token: string) {
        const hashedToken = TokenRepository.hashToken(token);
        return await TokenModel.updateOne({ token: hashedToken }, { isRevoked: true });
    }

    /**
     * Token'ları hashleyerek saklamak için SHA-256 kullanıyoruz.
     */
    public static hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Kullanıcının refresh tokenlarını sınırlı tut
     */
    async enforceTokenLimit(userId: string, maxTokens = 5) {
        const tokens = await TokenModel.find({ user: userId, isRevoked: false }).sort({ createdAt: 1 });
        if (tokens.length > maxTokens) {
            const excessTokens = tokens.slice(0, tokens.length - maxTokens);
            await TokenModel.updateMany(
                { _id: { $in: excessTokens.map(t => t._id) } },
                { isRevoked: true }
            );
        }
    }

    /**
     * Tek kullanımlık refresh token için eskiyi sil ve yenisini ekle
     */
    async replaceRefreshToken(
        userId: string,
        oldToken: string,
        newToken: string,
        clientInfo: { ip: string, userAgent: string, deviceInfo?: string }
    ) {
        await this.revokeToken(oldToken);
        await this.createRefreshToken(userId, newToken, clientInfo);
    }
}

export default new TokenRepository();
