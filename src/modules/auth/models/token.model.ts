import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IToken extends Document {
    user: Types.ObjectId;
    token: string;
    sessionId: string;              // Unique session identifier
    expiresAt: Date;                // Sliding expiry (30 gün, her refresh'te uzar)
    absoluteExpiresAt: Date;        // Absolute expiry (90 gün, hiç değişmez)
    type: 'refresh' | 'access' | 'reset' | 'twoFactorAuth';
    isRevoked: boolean;
    userAgent: string;
    ip: string;
    deviceInfo?: string;
    deviceFingerprint?: string;     // Browser fingerprint for enhanced security
    lastUsedAt?: Date;
    lastActivityAt?: Date;          // Son kullanıcı aktivitesi (idle timeout için)
    failedAttempts?: number;
    createdAt: Date;
    updatedAt: Date;
}

const TokenSchema: Schema<IToken> = new Schema<IToken>(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        token: { type: String, required: true },
        sessionId: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        absoluteExpiresAt: { type: Date, required: true },
        type: { type: String, enum: ['refresh', 'access', 'reset', 'twoFactorAuth'], required: true },
        isRevoked: { type: Boolean, default: false },
        userAgent: { type: String, required: true },
        ip: { type: String, required: true },
        deviceInfo: { type: String, required: false },
        deviceFingerprint: { type: String, required: false },
        lastUsedAt: { type: Date, required: false },
        lastActivityAt: { type: Date, default: Date.now },
        failedAttempts: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// 🚀 Tokenler belirlenen sürede otomatik silinecek (absoluteExpiresAt'e göre)
TokenSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Session lookup için index
TokenSchema.index({ sessionId: 1 }, { unique: true });
TokenSchema.index({ user: 1, isRevoked: 1 });

// 🔥 Token'in geçerli olup olmadığını kontrol eden metod
TokenSchema.methods.isValid = function (): boolean {
    const now = new Date();
    return !this.isRevoked && now < this.expiresAt && now < this.absoluteExpiresAt;
};

// 🔥 Idle timeout kontrolü (7 gün aktivite yoksa geçersiz)
TokenSchema.methods.isIdle = function (idleTimeoutDays: number = 7): boolean {
    if (!this.lastActivityAt) return false;
    const idleThreshold = new Date(Date.now() - idleTimeoutDays * 24 * 60 * 60 * 1000);
    return this.lastActivityAt < idleThreshold;
};

// 🚀 Geçersiz tokenlerin tespiti
TokenSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
    this.failedAttempts += 1;
    if (this.failedAttempts >= 5) {
        this.isRevoked = true;
    }
    await this.save();
};

export default mongoose.model<IToken>('Token', TokenSchema);
