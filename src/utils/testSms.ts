// src/utils/testSmtp.ts

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.log('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Connection Success:', success);
    }
});
