// src/modules/auth/models/token.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IToken extends Document {
    user: Types.ObjectId;
    token: string;                  // Düz metin token
    expiresAt: Date;
    type: 'refresh' | 'access' | 'reset';
    isRevoked: boolean;
    isValid(): boolean;
}

const TokenSchema: Schema<IToken> = new Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        type: {
            type: String,
            enum: ['refresh', 'access', 'reset'],
            required: true,
        },
        isRevoked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Token geçerlilik kontrol metodu
TokenSchema.methods.isValid = function (): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
};

// Indexler
TokenSchema.index({ user: 1, expiresAt: 1 });
TokenSchema.index({ isRevoked: 1 });
// Otomatik silme (TTL) için: expireAfterSeconds: 0
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IToken>('Token', TokenSchema);
