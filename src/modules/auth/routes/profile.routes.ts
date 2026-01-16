import { Router } from 'express';
// auth.controller'dan getMe metodunu import ediyoruz
import { getMe, updateProfile } from '../controllers/auth.controller'; 
import { authenticate } from '../../../middlewares/auth';

const router = Router();

// GET /api/profile/me: Oturum açmış kullanıcının bilgilerini getirir.
router.get('/me', authenticate, getMe);

// PUT /api/profile/: Oturum açmış kullanıcının profilini günceller.
// Mevcut updateProfile rotasını da buraya taşıyabiliriz, ancak şimdilik auth.routes'ta bırakıp sadece GET'i buraya alıyorum.
// Eğer updateProfile rotası auth.routes'tan buraya taşınırsa, auth.routes'taki PUT /profile silinmelidir.
// Ancak derleme hatasını çözmek için şimdilik sadece getMe'yi buraya tanımlayalım:
// router.put('/', authenticate, updateProfile); 

export default router;