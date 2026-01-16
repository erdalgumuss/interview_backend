import crypto from 'crypto';
import TokenModel, { IToken } from '../models/token.model';
import { hashToken } from '../../../utils/tokenUtils';
import { AUTH_CONFIG } from '../../../config/auth.config';

interface ClientInfo {
    ip: string;
    userAgent: string;
    deviceInfo?: string;
    deviceFingerprint?: string;
}

class TokenRepository {
    /**
     * Kullanıcı için refresh token oluşturup kaydeder.
     * Enterprise: Sliding window (30 gün) + Absolute max (90 gün)
     */
    async createRefreshToken(
        userId: string,
        token: string,
        sessionId: string,
        absoluteExp: number,
        clientInfo: ClientInfo
    ) {
        const hashedToken = hashToken(token);
        const now = new Date();
        
        // Sliding expiry: Her login/refresh'te 30 gün
        const slidingExpiresAt = new Date(now.getTime() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_MS);
        
        // Absolute expiry: Token payload'dan gelir (90 gün max)
        const absoluteExpiresAt = new Date(absoluteExp);

        return await TokenModel.create({
            user: userId,
            token: hashedToken,
            sessionId,
            expiresAt: slidingExpiresAt,
            absoluteExpiresAt,
            type: 'refresh',
            isRevoked: false,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            deviceInfo: clientInfo.deviceInfo || 'Unknown Device',
            deviceFingerprint: clientInfo.deviceFingerprint,
            lastUsedAt: now,
            lastActivityAt: now,
        });
    }

    /**
     * Session ID ile token bul
     */
    async findBySessionId(sessionId: string): Promise<IToken | null> {
        return await TokenModel.findOne({ 
            sessionId, 
            isRevoked: false,
        });
    }

    /**
     * Refresh token'ı veritabanında bul (Hashed Token ile karşılaştırma yap)
     */
    public async findRefreshToken(userId: string, token: string): Promise<IToken | null> {
        const hashedToken = hashToken(token);
        const now = new Date();
        
        const foundToken = await TokenModel.findOne({ 
            user: userId, 
            token: hashedToken, 
            isRevoked: false 
        });
    
        if (!foundToken) return null;

        // Sliding expiry kontrolü
        if (foundToken.expiresAt < now) {
            console.warn(`🚨 Sliding expiry exceeded for user: ${userId}`);
            return null;
        }

        // Absolute expiry kontrolü (90 gün)
        if (foundToken.absoluteExpiresAt < now) {
            console.warn(`🚨 Absolute session limit (90 days) exceeded for user: ${userId}`);
            await this.revokeToken(token);
            return null;
        }

        // Idle timeout kontrolü (7 gün aktivite yoksa)
        const idleThreshold = new Date(now.getTime() - AUTH_CONFIG.IDLE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);
        if (foundToken.lastActivityAt && foundToken.lastActivityAt < idleThreshold) {
            console.warn(`🚨 Idle timeout (7 days) for user: ${userId}`);
            await this.revokeToken(token);
            return null;
        }

        // Token geçerli, lastUsedAt güncelle
        await this.updateLastUsed(token);
    
        return foundToken;
    }
    
    /**
     * Refresh Token'ın kullanım zamanını güncelle
     */
    public async updateLastUsed(token: string) {
        const hashedToken = hashToken(token);
        const now = new Date();
        return await TokenModel.updateOne(
            { token: hashedToken }, 
            { 
                lastUsedAt: now,
                lastActivityAt: now,
            }
        );
    }

    /**
     * Aktivite zamanını güncelle (kullanıcı herhangi bir işlem yaptığında)
     */
    public async updateActivity(sessionId: string) {
        return await TokenModel.updateOne(
            { sessionId, isRevoked: false },
            { lastActivityAt: new Date() }
        );
    }

    /**
     * Sliding window: Her refresh'te expiry'yi uzat (30 gün daha)
     */
    public async extendSlidingExpiry(sessionId: string): Promise<void> {
        const newExpiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_MS);
        await TokenModel.updateOne(
            { sessionId, isRevoked: false },
            { 
                expiresAt: newExpiresAt,
                lastUsedAt: new Date(),
                lastActivityAt: new Date(),
            }
        );
    }

    /**
     * Kullanıcının eski refresh tokenlarını iptal et
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
     * Session ID ile token iptal et
     */
    async revokeBySessionId(sessionId: string) {
        return await TokenModel.updateOne({ sessionId }, { isRevoked: true });
    }

    /**
     * Token'ları hashleyerek saklamak için SHA-256 kullanıyoruz.
     */
    public hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Kullanıcının aktif oturumlarını getir
     */
    async getActiveSessions(userId: string): Promise<IToken[]> {
        return await TokenModel.find({ 
            user: userId, 
            isRevoked: false,
            expiresAt: { $gt: new Date() },
            absoluteExpiresAt: { $gt: new Date() },
        }).sort({ lastActivityAt: -1 });
    }

    /**
     * Kullanıcının refresh tokenlarını sınırlı tut (max 5 cihaz)
     */
    async enforceTokenLimit(userId: string, maxTokens = AUTH_CONFIG.MAX_DEVICES_PER_USER) {
        const tokens = await TokenModel.find({ user: userId, isRevoked: false })
            .sort({ lastActivityAt: -1 }); // En son aktif olan en başta

        if (tokens.length > maxTokens) {
            // En eski (en az aktif) token'ları sil
            const tokensToRevoke = tokens.slice(maxTokens);
            await TokenModel.updateMany(
                { _id: { $in: tokensToRevoke.map(t => t._id) } },
                { isRevoked: true }
            );
            console.log(`🔄 Revoked ${tokensToRevoke.length} old sessions for user ${userId}`);
        }
    }

    /**
     * Şüpheli refresh token kullanımını kontrol et
     */
    public async detectSuspiciousActivity(userId: string, ip: string, userAgent: string) {
        const recentTokens = await TokenModel.find({ user: userId, isRevoked: false })
            .sort({ lastUsedAt: -1 })
            .limit(5);

        const uniqueDevices = new Set(recentTokens.map(t => `${t.ip}:${t.userAgent}`));
        
        // 3 farklı cihazdan aynı anda erişim şüpheli
        if (uniqueDevices.size >= 3) {
            console.warn(`🚨 Suspicious activity: User=${userId} has ${uniqueDevices.size} active devices`);
            return true;
        }

        return false;
    }

    /**
     * Token rotation: Eski token'ı iptal et, yenisini oluştur
     */
    async rotateRefreshToken(
        userId: string,
        oldToken: string,
        newToken: string,
        sessionId: string,
        absoluteExp: number,
        clientInfo: ClientInfo
    ) {
        // Eski token'ı iptal et
        await TokenModel.updateOne(
            { user: userId, token: hashToken(oldToken) },
            { isRevoked: true }
        );
        
        // Yeni token oluştur (aynı session, yeni sliding expiry)
        await this.createRefreshToken(userId, newToken, sessionId, absoluteExp, clientInfo);
    }

    /**
     * Expired ve revoked token'ları temizle (cron job için)
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await TokenModel.deleteMany({
            $or: [
                { isRevoked: true, updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                { absoluteExpiresAt: { $lt: new Date() } },
            ]
        });
        return result.deletedCount;
    }
}

export default new TokenRepository();
