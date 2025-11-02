import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { CreateAppointmentDTO } from '../dtos/createAppointment.dto';
import { AppError } from '../../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../../constants/errors';


/**
 * Randevu (Appointment) Yönetimi için Controller.
 * InterviewController yapısını taklit eder.
 */
export class AppointmentController {
    private appointmentService: AppointmentService;

    constructor() {
        // Service sınıfının bir örneğini oluştur
        this.appointmentService = new AppointmentService();
    }

    /**
     * GET /appointments - Tüm randevuları getir (Kullanıcınınkileri filtrele).
     */
    public getAllAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // İK yetkilisi kimlik doğrulaması zaten 'authenticate' middleware'i tarafından yapılmış olmalı.
            const userId = req.user?.id;
            
            // TODO: Servis katmanında sadece bu kullanıcıya ait randevuları getirme mantığı eklenecek.
            const appointments = await this.appointmentService.findAllAppointments();
            
            res.json({ 
                success: true, 
                data: appointments 
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /appointments - Yeni randevu oluşturma.
     */
    public createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = req.body as CreateAppointmentDTO;
            const userId = req.user?.id as string; // Yetkili kullanıcının ID'si (Randevuyu oluşturan)

            if (!userId) {
                return next(new AppError('User authentication failed', ErrorCodes.UNAUTHORIZED, 401));
            }

            const newAppointment = await this.appointmentService.createAppointment(body, userId);
            
            // 201 Created yanıtı
            res.status(201).json({ 
                success: true, 
                data: newAppointment 
            });
        } catch (error) {
            // Randevu tarihi geçerlilik hataları Service'ten fırlatılabilir.
            next(error);
        }
    };
    
    /**
     * DELETE /appointments/:id - Randevuyu silme.
     */
    public deleteAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id; // Sahiplik kontrolü için

            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }
            
            // TODO: Servis katmanında bu randevunun gerçekten bu kullanıcı tarafından oluşturulup oluşturulmadığı kontrol edilmelidir.
            await this.appointmentService.deleteAppointment(id);
            
            // 204 No Content yanıtı silme işlemleri için idealdir.
            res.status(204).json({ 
                success: true, 
                message: 'Appointment deleted successfully' 
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /appointments/:id/reminder - Randevu hatırlatıcısı gönderme.
     */
    public sendAppointmentReminder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id as string;

            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            await this.appointmentService.sendReminder(id, userId);

            res.json({ 
                success: true, 
                message: 'Reminder successfully queued/sent' 
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new AppointmentController();
