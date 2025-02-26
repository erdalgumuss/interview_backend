import crypto from 'crypto';
import TokenModel, { IToken } from '../models/token.model';
import { hashToken } from '../../../utils/tokenUtils';

class TokenRepository {
    /**
     * Kullanıcı için refresh token oluşturup kaydeder.
     */
    async createRefreshToken(
        userId: string,
        token: string,
        clientInfo: { ip: string, userAgent: string, deviceInfo?: string }
    ) {
        const hashedToken = hashToken(token);
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
    public async findRefreshToken(userId: string, token: string): Promise<IToken | null> {
        const hashedToken = hashToken(token);
        const foundToken = await TokenModel.findOne({ user: userId, token: hashedToken, isRevoked: false });

        // 🚨 Token süresi dolmuşsa direkt iptal et
        if (foundToken && foundToken.expiresAt < new Date()) {
            await this.revokeToken(token);
            return null;
        }

        if (foundToken) {
            await this.updateLastUsed(token);
        }

        return foundToken;
    }
    /**
     * Refresh Token'ın kullanım zamanını güncelle
     */

    public async updateLastUsed(token: string) {
        const hashedToken = hashToken(token);
        return await TokenModel.updateOne({ token: hashedToken }, { lastUsedAt: new Date() });
    }

    /**
     * Kullanıcının eski refresh tokenlarını iptal et (Logout, yeni giriş vb. durumlarda)
     */
    public async revokeAllTokens(userId: string) {
        await TokenModel.updateMany({ user: userId }, { isRevoked: true });
    }

     /**
     * Tek bir refresh token'ı iptal et
     */
     async revokeToken(token: string) {
        const hashedToken = hashToken(token);
        return await TokenModel.updateOne({ token: hashedToken }, { isRevoked: true });
    }

    /**
     * Token'ları hashleyerek saklamak için SHA-256 kullanıyoruz.
     */
    public hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Kullanıcının refresh tokenlarını sınırlı tut
     */
    async enforceTokenLimit(userId: string, maxTokens = 5) {
        const tokens = await TokenModel.find({ user: userId, isRevoked: false }).sort({ createdAt: 1 });

        if (tokens.length > maxTokens) {
            const tokensToDelete = tokens.slice(0, tokens.length - maxTokens);
            await TokenModel.deleteMany({ _id: { $in: tokensToDelete.map(t => t._id) } });
        }
    }
    /**
     * Şüpheli refresh token kullanımını kontrol et
     */
    public async detectSuspiciousActivity(userId: string, ip: string, userAgent: string) {
        const recentTokens = await TokenModel.find({ user: userId, isRevoked: false }).sort({ lastUsedAt: -1 }).limit(5);

        if (recentTokens.some(token => token.ip !== ip || token.userAgent !== userAgent)) {
            console.warn(`🚨 Şüpheli giriş: Kullanıcı=${userId}, IP=${ip}, User-Agent=${userAgent}`);
            await this.revokeAllTokens(userId);
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
