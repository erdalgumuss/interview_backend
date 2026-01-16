import { Router, Request, Response, NextFunction } from 'express';
import appointmentController from '../controllers/appointment.controller'; // Singleton instance import edildi
import { authenticate } from '../../../../middlewares/auth';
import { validateRequest } from '../../../../middlewares/validationMiddleware';
// DTO ve Zod/Joi şeması (varsayılan olarak Joi/Yup kullandığınızı varsayarak)
// Not: `CreateAppointmentDTO` dosyanızda DTO sınıfını gördüm. 
// Validasyonu `validationMiddleware` ile yapmak için şemayı da import etmeliyiz. 
// (createAppointment.dto.ts'de `class-validator` kullanılmış, bu durumda rota yapısı değişmelidir veya Joi/Yup şeması oluşturulmalıdır.)
// Şema adı olarak `createAppointmentSchema` kullanılacağını varsayıyorum.
// import { createAppointmentSchema } from '../dtos/createAppointment.dto'; 

// --- Async Hata Yakalama Yardımcı Fonksiyonu (Interview Routes'tan kopyalandı) ---
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// --- Randevu Listesi Çekme (GET /api/appointments) ---
// Controller metodu, bind ve asyncHandler ile sarmalandı
router.get('/', authenticate, asyncHandler(appointmentController.getAllAppointments.bind(appointmentController)));

// --- Yeni Randevu Oluşturma (POST /api/appointments) ---
// Not: createAppointmentSchema'nın import edilmesi gerekiyor. Şimdilik yoruma alıyorum.
router.post(
    '/', 
    authenticate, 
    // validateRequest(createAppointmentSchema), // Validation şeması eklenebilir.
    asyncHandler(appointmentController.createAppointment.bind(appointmentController))
);

// --- Randevu Silme (DELETE /api/appointments/:id) ---
router.delete('/:id', authenticate, asyncHandler(appointmentController.deleteAppointment.bind(appointmentController)));

// --- Hatırlatma Gönderme (POST /api/appointments/:id/reminder) ---
router.post('/:id/reminder', authenticate, asyncHandler(appointmentController.sendAppointmentReminder.bind(appointmentController)));

export default router;