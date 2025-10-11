import mongoose, { Document, Schema, Types, CallbackError } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'company' | 'user';
    isActive: boolean;
    preferences?: {
        language?: 'en' | 'es' | 'fr' | 'tr';
        themeMode?: 'light' | 'dark'; // Backend'deki isimlendirme
        notificationsEnabled?: boolean;
        timezone?: string;
    };

    // Hesap kilitleme & giriş denemeleri
    accountLockedUntil?: Date;
    failedLoginAttempts: number;

    // Doğrulama ve güvenlik alanları
    emailVerified: boolean;
    phoneVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    phone?: string;
    tokenVersion: number;
    lastLoginAt?: Date;
    lastKnownIPs?: string[];
    sessionCount: number;

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

    // Erişim izinleri
    permissions: {
        module: string;
        accessLevel: 'read' | 'write' | 'delete';
    }[];

    // timestamps
    createdAt: Date;
    updatedAt: Date;

    // Metodlar
    comparePassword(candidatePassword: string): Promise<boolean>;
    incrementFailedLogins(): Promise<void>;
    clearPasswordResetToken(): Promise<void>;
    incrementTokenVersion(): Promise<void>;
    updateLastLogin(ip: string): Promise<void>;
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
            enum: ['admin', 'company', 'user', 'super_admin'],
            default: 'user',
        },
        isActive: { type: Boolean, default: true },
        accountLockedUntil: { type: Date },
        failedLoginAttempts: { type: Number, default: 0 },
        emailVerified: { type: Boolean, default: false },
        phoneVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String },
        emailVerificationExpires: { type: Date },
        tokenVersion: { type: Number, default: 0 },
        lastLoginAt: { type: Date },
        lastKnownIPs: [{ type: String }],
        sessionCount: { type: Number, default: 0 },
        passwordResetToken: { type: String },
        passwordResetExpires: { type: Date },
        passwordResetTries: { type: Number, default: 0 },
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: { type: String },
        profilePicture: { type: String },
        bio: { type: String, trim: true },
        phone: {
            type: String,
            match: /^\+?[1-9]\d{1,14}$/,
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
        preferences: {
            type: {
                language: { type: String, enum: ['en', 'es', 'fr', 'tr'], default: 'tr' },
                themeMode: { type: String, enum: ['light', 'dark'], default: 'light' },
                notificationsEnabled: { type: Boolean, default: true },
                timezone: { type: String, default: 'Europe/Istanbul' },
            },
            default: {},
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
 * Başarısız giriş deneme sayısını artırma
 */
UserSchema.methods.incrementFailedLogins = async function (): Promise<void> {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
        this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika kilitle
    }
    await this.save();
};

/**
 * Şifre sıfırlama tokenını temizleme
 */
UserSchema.methods.clearPasswordResetToken = async function (): Promise<void> {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    await this.save();
};

/**
 * Token versiyonunu artırma (ör. şifre değişiminde)
 */
UserSchema.methods.incrementTokenVersion = async function (): Promise<void> {
    this.tokenVersion += 1;
    await this.save();
};

/**
 * Son giriş zamanını güncelleme ve IP kaydını ekleme
 * Son 5 IP saklanacak.
 */
UserSchema.methods.updateLastLogin = async function (ip: string): Promise<void> {
    this.lastLoginAt = new Date();

    if (!this.lastKnownIPs) {
        this.lastKnownIPs = [];
    }
    if (!this.lastKnownIPs.includes(ip)) {
        this.lastKnownIPs.push(ip);
        if (this.lastKnownIPs.length > 5) {
            this.lastKnownIPs.shift(); // İlk eklenen eski IP silinir
        }
    }
    await this.save();
};

/**
 * JSON dönüşümünde hassas bilgileri kaldırma
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
