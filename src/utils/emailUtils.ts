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
        pass: process.env.EMAIL_PASSWORD,
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
      subject: "E-mail Doğrulama",
      html: `
        <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${verificationLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">E-maili Doğrula</a>
        <p>Bu bağlantı 60 dakika geçerlidir.</p>
      `,
    };
  
    await transporter.sendMail(mailOptions);
  }
/**
 * 🔹 Şifre sıfırlama için e-posta gönderme
 */
export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
        <p>Hesabınızın şifresini değiştirmek için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${resetLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
        <p>Bu bağlantı 15 dakika boyunca geçerlidir.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
}
