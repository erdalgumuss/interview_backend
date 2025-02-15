// src/utils/emailUtils.ts

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // .env dosyasını yükle

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true ise TLS kullanır
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * E-posta gönderme fonksiyonu
 */
export async function sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Please verify your email by clicking <a href="${verificationLink}">this link</a>.</p>`,
    };

    await transporter.sendMail(mailOptions);
}
/**
 * 🔹 Şifre sıfırlama için e-posta gönderme
 */
export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.APP_URL}/api/auth/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `<p>To reset your password, please click <a href="${resetLink}">this link</a>.</p>
               <p>If you did not request a password reset, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);
}
