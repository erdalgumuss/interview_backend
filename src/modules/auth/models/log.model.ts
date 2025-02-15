// src/modules/auth/models/log.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILog extends Document {
    action: string;    // Yapılan işlem (ör: 'login', 'create_interview')
    user: Types.ObjectId;
    details?: string;  // İşlemle ilgili ek bilgiler
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;   // Otomatik (timestamps) ile gelecek
}

const LogSchema: Schema<ILog> = new Schema(
    {
        action: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        details: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Örnek index
LogSchema.index({ user: 1, action: 1 });

export default mongoose.model<ILog>('Log', LogSchema);
