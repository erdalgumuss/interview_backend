// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { register, verifyEmail, login, logout, refreshAccessToken, requestPasswordReset, resetPassword, updateProfile} from '../controllers/auth.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

// Register
router.post('/register', register);

// Email Doğrulama
router.get('/verify-email', verifyEmail);

// Login
router.post('/login', login);

router.post('/logout',authenticate, logout);

router.post('/refresh',  refreshAccessToken);

router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.put('/profile', authenticate, updateProfile);


export default router;
