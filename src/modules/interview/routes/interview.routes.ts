import { Router } from 'express';
import InterviewController from '../controllers/interview.controller';
import { authenticate } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createInterviewSchema } from '../dtos/createInterview.dto';
import { updateInterviewSchema } from '../dtos/updateInterview.dto';

const router = Router();

// Express'in async fonksiyonları düzgün çalıştırabilmesi için bir yardımcı fonksiyon
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/create', authenticate, asyncHandler(InterviewController.createInterview.bind(InterviewController)));

// Tüm mülakatları getir (Admin)
router.get('/all', authenticate, asyncHandler(InterviewController.getAllInterviews));

// Kullanıcının mülakatlarını getir
router.get('/my', authenticate, asyncHandler(InterviewController.getUserInterviews));

// Belirli bir mülakatı getir
router.get('/:id', authenticate, asyncHandler(InterviewController.getInterviewById));

// Mülakat güncelleme
router.put('/:id', authenticate, /*validateRequest(updateInterviewSchema),*/ asyncHandler(InterviewController.updateInterview));

// Mülakat silme
router.delete('/:id', authenticate, asyncHandler(InterviewController.deleteInterview));

export default router;
