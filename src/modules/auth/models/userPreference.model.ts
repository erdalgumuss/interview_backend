// src/modules/auth/models/userPreference.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserPreference extends Document {
    userId: Types.ObjectId;
    language: 'en' | 'es' | 'fr' | 'tr';
    theme: {
        mode: 'light' | 'dark';
        customColors?: Map<string, string>;
    };
    notificationsEnabled: boolean;
    notificationSettings: {
        email: boolean;
        sms: boolean;
        inApp: boolean;
    };
    timezone: string;
}

const UserPreferenceSchema: Schema<IUserPreference> = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        language: { type: String, enum: ['en', 'es', 'fr', 'tr'], default: 'en' },
        theme: {
            mode: { type: String, enum: ['light', 'dark'], default: 'light' },
            customColors: { type: Map, of: String },
        },
        notificationsEnabled: { type: Boolean, default: true },
        notificationSettings: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            inApp: { type: Boolean, default: true },
        },
        timezone: { type: String, default: 'UTC' },
    },
    { timestamps: true }
);

UserPreferenceSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<IUserPreference>('UserPreference', UserPreferenceSchema);
