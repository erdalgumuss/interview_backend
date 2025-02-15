// src/modules/auth/routes/profile.routes.ts

import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { getProfile, updateProfile, changePassword, uploadProfilePicture } from '../controllers/profile.controller';
import { upload } from '../../../middlewares/upload';

const router = Router();

// Profil bilgilerini getir
router.get('/me', authenticate, getProfile);

// Profil güncelleme
router.put('/update', authenticate, updateProfile);

// Şifre değiştirme
router.put('/change-password', authenticate, changePassword);

// Profil resmi yükleme (multipart/form-data)
router.post('/upload-picture', authenticate, upload.single('profilePicture'), uploadProfilePicture);

export default router;
