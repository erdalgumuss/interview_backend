// src/modules/auth/models/user.model.ts

import mongoose, {
    Document,
    Schema,
    Types,
    CallbackError,
} from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    _id: Types.ObjectId; // BURAYA EKLENDİ
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'company' | 'user';
    isActive: boolean;

    // Güvenlik / hesap kilitleme
    accountLockedUntil?: Date;
    failedLoginAttempts: number;
    clearPasswordResetToken(): Promise<void>;  // ✅ BURAYA EKLENDİ

    // Doğrulamalar
    emailVerified: boolean;
    phoneVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    phone?: string;

    // Parola sıfırlama
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordResetTries?: number;

    // 2FA
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;

    // Profil bilgileri
    profilePicture?: string;
    bio?: string;

    // Erişim izinleri (örneğin farklı modüllere erişim)
    permissions: {
        module: string;
        accessLevel: 'read' | 'write' | 'delete';
    }[];

    // timestamps
    createdAt: Date;
    updatedAt: Date;

    // ---------------------------
    // Metodlar
    // ---------------------------
    comparePassword(candidatePassword: string): Promise<boolean>;
    incrementFailedLogins(): Promise<void>;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
        },

        role: {
            type: String,
            enum: ['admin', 'company', 'user'],
            default: 'user',
        },
        isActive: { type: Boolean, default: true },

        accountLockedUntil: { type: Date },
        failedLoginAttempts: { type: Number, default: 0 },


        emailVerified: { type: Boolean, default: false },
        phoneVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String },
        emailVerificationExpires: { type: Date },

        passwordResetToken: { type: String },
        passwordResetExpires: { type: Date },
        passwordResetTries: { type: Number, default: 0 },

        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: { type: String },

        profilePicture: { type: String },
        bio: { type: String, trim: true },

        phone: {
            type: String,
            match: /^\+?[1-9]\d{1,14}$/, // E.164 format
        },

        permissions: {
            type: [
                {
                    module: { type: String },
                    accessLevel: {
                        type: String,
                        enum: ['read', 'write', 'delete'],
                    },
                },
            ],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Şifre Hashleme (Pre-save)
 * Yalnızca password alanı değiştiğinde tekrar hash işlemi yapılır.
 */
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = 12;
        const salt = await bcrypt.genSalt(saltRounds);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as CallbackError);
    }
});

/**
 * Şifre Karşılaştırma
 */
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Başarısız giriş deneme sayısını arttırma
 */
UserSchema.methods.incrementFailedLogins = async function (): Promise<void> {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
        this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 dk kilit
    }
    await this.save();
};

UserSchema.methods.clearPasswordResetToken = async function () {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    await this.save();
};


/**
 * JSON dönüşümünde hassas bilgileri silme
 */
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.twoFactorSecret;
        return ret;
    },
});

/**
 * Indexler
 */
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
