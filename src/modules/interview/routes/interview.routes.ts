import { Router } from 'express';
import interviewController from '../controllers/interview.controller'; // ✅ Burada doğrudan örneği çağırıyoruz.
import { authenticate } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createInterviewSchema } from '../dtos/createInterview.dto';
import { updateInterviewSchema } from '../dtos/updateInterview.dto';

const router = Router();

// Express'in async fonksiyonları düzgün çalıştırabilmesi için bir yardımcı fonksiyon
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Mülakat oluşturma
router.post('/create', authenticate, asyncHandler(interviewController.createInterview.bind(interviewController)));

// Tüm mülakatları getir (Admin)
router.get('/all', authenticate, asyncHandler(interviewController.getAllInterviews.bind(interviewController)));

// Kullanıcının mülakatlarını getir
router.get('/my', authenticate, asyncHandler(interviewController.getUserInterviews.bind(interviewController)));

// Belirli bir mülakatı getir
router.get('/:id', authenticate, asyncHandler(interviewController.getInterviewById.bind(interviewController)));

// Mülakat güncelleme
router.put('/:id', authenticate, /*validateRequest(updateInterviewSchema), */asyncHandler(interviewController.updateInterview.bind(interviewController)));

// Mülakat silme
router.delete('/:id', authenticate, asyncHandler(interviewController.deleteInterview.bind(interviewController)));
// Mülakat durumu güncelleme (Publish, Inactivate)
router.put('/:id/status', authenticate, asyncHandler(interviewController.updateInterviewStatus.bind(interviewController)));

//Mülakat katılım linki oluşturma
router.put('/:id/link', authenticate, asyncHandler(interviewController.generateInterviewLink.bind(interviewController)));

//Mülakata soru ekleme, silme ve güncelleme
router.put('/:id/questions', authenticate, asyncHandler(interviewController.updateInterviewQuestions.bind(interviewController)));

//PersonalityTest modülüyle ilişkilendirme
router.put('/:id/personality-test', authenticate, asyncHandler(interviewController.updatePersonalityTest.bind(interviewController)));

export default router;
