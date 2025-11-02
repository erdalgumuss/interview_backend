import { Router } from 'express';
import interviewController from '../controllers/interview.controller'; 
import { authenticate } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createInterviewSchema } from '../dtos/createInterview.dto';
// updateInterviewSchema'yı kullanabilmek için yeni bir dosya ekleyeceğiz (updateInterview.dto.ts)
import { updateInterviewSchema } from '../dtos/updateInterview.dto'; 
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Express'in async fonksiyonları düzgün çalıştırabilmesi için yardımcı fonksiyon
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
};

// --- MÜLAKAT OLUŞTURMA (POST) ---
router.post('/', authenticate, validateRequest(createInterviewSchema), asyncHandler(interviewController.createInterview.bind(interviewController)));

// --- MÜLAKAT GÜNCELLEME (PUT) ---
// Not: PUT, kaynağın tamamını değiştirmek için kullanılır. Questions, title, vb. hepsi bu rotada güncellenmeli.
router.put('/:id', 
    authenticate, 
    validateRequest(updateInterviewSchema), // 📌 Yeni DTO kullanılmalı
    asyncHandler(interviewController.updateInterview.bind(interviewController))
);

// --- MÜLAKAT YAYINLAMA (PATCH/POST) ---
// Kaynağın sadece durumunu değiştirir, PATCH daha uygun.
router.patch('/:id/publish', authenticate, asyncHandler(interviewController.publishInterview.bind(interviewController)));

// --- MÜLAKAT LİNKİ GÜNCELLEME (PATCH) ---
// Süre uzatma veya link yeniden oluşturma için kullanılabilir.
router.patch('/:id/link', authenticate, asyncHandler(interviewController.generateInterviewLink.bind(interviewController)));

// --- MÜLAKAT SİLME (DELETE) ---
router.delete('/:id', authenticate, asyncHandler(interviewController.deleteInterview.bind(interviewController)));


// --- SORGULAMA (GET) ---
router.get('/all', authenticate, asyncHandler(interviewController.getAllInterviews.bind(interviewController)));
router.get('/my', authenticate, asyncHandler(interviewController.getUserInterviews.bind(interviewController)));
router.get('/dashboard', authenticate, asyncHandler(interviewController.getUserInterviews.bind(interviewController))); // 'my' ile aynı endpoint olduğu varsayıldı
router.get('/:id', authenticate, asyncHandler(interviewController.getInterviewById.bind(interviewController)));



export default router;