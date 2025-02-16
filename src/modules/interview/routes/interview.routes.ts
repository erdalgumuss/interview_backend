import { Router } from 'express';
import interviewController from '../controllers/interview.controller'; 
import { authenticate } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createInterviewSchema } from '../dtos/createInterview.dto';
import { updateInterviewSchema } from '../dtos/updateInterview.dto';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Express'in async fonksiyonları düzgün çalıştırabilmesi için yardımcı fonksiyon
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
};

// 📌 Mülakat oluşturma
router.post('/create', authenticate, validateRequest(createInterviewSchema), asyncHandler(interviewController.createInterview.bind(interviewController)));

// 📌 Tüm mülakatları getir (Admin)
router.get('/all', authenticate, asyncHandler(interviewController.getAllInterviews.bind(interviewController)));

// 📌 Kullanıcının mülakatlarını getir
router.get('/my', authenticate, asyncHandler(interviewController.getUserInterviews.bind(interviewController)));

// 📌 Belirli bir mülakatı getir
router.get('/:id', authenticate, asyncHandler(interviewController.getInterviewById.bind(interviewController)));

// 📌 Mülakat güncelleme
router.put('/:id', authenticate, validateRequest(updateInterviewSchema), asyncHandler(interviewController.updateInterview.bind(interviewController)));

// 📌 Mülakatı soft delete yap
router.delete('/:id', authenticate, asyncHandler(interviewController.deleteInterview.bind(interviewController)));

// 📌 Mülakatın durumunu güncelle (Publish, Inactivate)
router.put(
    '/:id/status', 
    authenticate, 
    validateRequest(updateInterviewSchema),
    asyncHandler(interviewController.updateInterviewStatus.bind(interviewController))
);

// 📌 Mülakat katılım linki oluşturma (Sadece link güncellendiği için PATCH kullanıldı)
router.patch('/:id/link', authenticate, asyncHandler(interviewController.generateInterviewLink.bind(interviewController)));

// 📌 Mülakatın sorularını güncelleme (Sadece sorular güncellendiği için PATCH kullanıldı)
router.patch('/:id/questions', authenticate, asyncHandler(interviewController.updateInterviewQuestions.bind(interviewController)));

// 📌 PersonalityTest modülüyle ilişkilendirme (Sadece kişilik testi ID değiştirildiği için PATCH kullanıldı)
router.patch('/:id/personality-test', authenticate, asyncHandler(interviewController.updatePersonalityTest.bind(interviewController)));

export default router;
