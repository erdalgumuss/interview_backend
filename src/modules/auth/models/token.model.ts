import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IToken extends Document {
    user: Types.ObjectId;
    token: string;
    expiresAt: Date;
    type: 'refresh' | 'access' | 'reset' | 'twoFactorAuth';
    isRevoked: boolean;
    userAgent: string;
    ip: string;
    deviceInfo?: string;
    lastUsedAt?: Date;
    failedAttempts?: number;  // 🚨 Yeni: Token kötüye kullanımını takip etmek için
}

const TokenSchema: Schema<IToken> = new Schema<IToken>(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        type: { type: String, enum: ['refresh', 'access', 'reset', 'twoFactorAuth'], required: true },
        isRevoked: { type: Boolean, default: false },
        userAgent: { type: String, required: true },
        ip: { type: String, required: true },
        deviceInfo: { type: String, required: false },
        lastUsedAt: { type: Date, required: false },
        failedAttempts: { type: Number, default: 0 },  // 🚨 Eklenen: Token tekrar tekrar yanlış kullanılırsa takibe almak için
    },
    { timestamps: true }
);

// 🚀 Tokenler belirlenen sürede otomatik silinecek
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🔥 Token'in geçerli olup olmadığını kontrol eden metod
TokenSchema.methods.isValid = function (): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
};

// 🚀 Geçersiz tokenlerin tespiti
TokenSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
    this.failedAttempts += 1;
    if (this.failedAttempts >= 5) {
        this.isRevoked = true;  // 5 defa hatalı kullanılırsa token otomatik iptal edilir
    }
    await this.save();
};

export default mongoose.model<IToken>('Token', TokenSchema);
