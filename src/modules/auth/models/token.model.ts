import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IToken extends Document {
    user: Types.ObjectId;
    token: string; // Hashlenmiş token
    expiresAt: Date;
    type: 'refresh' | 'access' | 'reset';
    isRevoked: boolean;
    isValid(): boolean;
    userAgent: string;  // ✅ Yeni eklenen alan
    ip: string;         // ✅ Yeni eklenen alan
    deviceInfo?: string;  // Kullanıcının token oluşturduğu cihaz bilgisi
    lastUsedAt?: Date;    // Token’ın en son ne zaman kullanıldığı
}

const TokenSchema: Schema<IToken> = new Schema<IToken>(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        token: { type: String, required: true }, // ✅ Hash olarak saklanıyor
        expiresAt: { type: Date, required: true },
        type: {
            type: String,
            enum: ['refresh', 'access', 'reset'],
            required: true,
        },
        isRevoked: { type: Boolean, default: false },
        userAgent: { type: String, required: true },  // ✅ Yeni eklenen alan
        ip: { type: String, required: true },           // ✅ Yeni eklenen alan
        deviceInfo: { type: String, required: false },    // İsteğe bağlı
        lastUsedAt: { type: Date, required: false },      // İsteğe bağlı
    },
    { timestamps: true }
);

// ✅ Token otomatik olarak silinecek (MongoDB TTL özelliği)
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Token geçerlilik kontrol metodu
TokenSchema.methods.isValid = function (): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
};

export default mongoose.model<IToken>('Token', TokenSchema);
