// src/modules/auth/models/subscription.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubscription extends Document {
    user: Types.ObjectId;        // Abonelik sahibi kullanıcı
    plan: 'basic' | 'pro' | 'enterprise';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    paymentDetails?: string;

    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema: Schema<ISubscription> = new Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        plan: {
            type: String,
            enum: ['basic', 'pro', 'enterprise'],
            default: 'basic',
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        paymentDetails: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Sanal alan (opsiyonel) - Abonelik sona ermiş mi
SubscriptionSchema.virtual('isExpired').get(function (this: ISubscription) {
    return Date.now() > this.endDate.getTime();
});

// Kaydetmeden önce isActive değerini otomatik güncelle
SubscriptionSchema.pre('save', function (next) {
    if (Date.now() > this.endDate.getTime()) {
        this.isActive = false;
    }
    next();
});

SubscriptionSchema.index({ user: 1, isActive: 1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
