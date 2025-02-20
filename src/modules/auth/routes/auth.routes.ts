// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { register, verifyEmail, login, logout, refreshAccessToken, requestPasswordReset, resetPassword } from '../controllers/auth.controller';

const router = Router();

// Register
router.post('/register', register);

// Email Doğrulama
router.get('/verify-email', verifyEmail);

// Login
router.post('/login', login);

router.post('/logout', logout);

router.post('/refresh', refreshAccessToken);

router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);


export default router;
