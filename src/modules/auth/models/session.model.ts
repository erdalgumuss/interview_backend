// src/modules/auth/models/session.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISession extends Document {
    userId: Types.ObjectId;
    ipAddress: string;
    userAgent: string;
    loggedInAt: Date;
    expiresAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        ipAddress: { type: String, required: true },
        userAgent: { type: String, required: true },
        loggedInAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true,
    }
);

// Indexler
SessionSchema.index({ userId: 1, expiresAt: 1 });

export default mongoose.model<ISession>('Session', SessionSchema);
