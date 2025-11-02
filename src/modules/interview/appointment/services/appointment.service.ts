import { AppointmentRepository } from '../repositories/appointment.repository';
import { CreateAppointmentDTO } from '../dtos/createAppointment.dto';
import { IAppointment } from '../models/appointment.model';
import { AppError } from '../../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../../constants/errors';
import mongoose from 'mongoose'; 

/**
 * Randevu (Appointment) iş mantığını yönetir.
 * InterviewService'in formatına uygun olarak yapılandırılmıştır.
 */
export class AppointmentService { // Sınıf olarak dışa aktarılıyor
    private appointmentRepository: AppointmentRepository;

    // Repository'yi constructor'da enjekte et (InterviewService'deki gibi)
    constructor() {
        this.appointmentRepository = new AppointmentRepository();
    }

    /**
     * Tüm randevuları getirir. (Gelecekte kullanıcıya göre filtreleme eklenecektir.)
     */
    public async findAllAppointments(): Promise<IAppointment[]> {
        return this.appointmentRepository.findAll();
    }

    /**
     * Yeni randevu oluşturur.
     */
    public async createAppointment(data: CreateAppointmentDTO, userId: string): Promise<IAppointment> {
        const { candidateName, type, date, duration, sendEmail, sendSMS } = data;

        // Frontend'den gelen string tarihi Date objesine çeviriyoruz.
        const appointmentDate = new Date(date);

        if (isNaN(appointmentDate.getTime())) {
            throw new AppError('Geçersiz randevu tarihi formatı.', ErrorCodes.VALIDATION_ERROR, 400);
        }
        
        // 📌 KRİTİK HATA ÇÖZÜMÜ: mongoose.Types.ObjectId constructor çağrısı tip hatasına neden olduğu için,
        // modelde beklenen ObjectId tipini elde etmenin en güvenli yolu kullanıldı.
        // InterviewService'de de aynı yapı kullanıldığı için Mongoose'un kendisi tarafından tanınan tipi kullanıyoruz.
        const createdByObjectId = mongoose.Types.ObjectId.createFromHexString(userId); 

        const newAppointment = await this.appointmentRepository.create({
            candidateName,
            type,
            date: appointmentDate,
            duration,
            // createdBy alanının tipi doğru set edildi.
            createdBy: createdByObjectId as any, // ⚠️ Tipi geçici olarak 'any' yaparak Mongoose tip sistemindeki esnekliği sağlıyoruz.
            isReminderSent: false,
        });

        // 💡 Business Logic: Randevu oluşturulurken bildirimleri hemen gönder
        if (sendEmail) {
            // await sendReminderEmail(candidateName, appointmentDate); 
        }
        if (sendSMS) {
            // await sendReminderSMS(candidateName, appointmentDate);
        }

        return newAppointment;
    }
    
    /**
     * Randevuyu siler.
     */
    public async deleteAppointment(id: string): Promise<void> {
        const deletedAppointment = await this.appointmentRepository.delete(id);
        if (!deletedAppointment) {
            throw new AppError('Silinecek randevu bulunamadı.', ErrorCodes.NOT_FOUND, 404);
        }
    }

    /**
     * Randevu hatırlatıcısı gönderir.
     */
    public async sendReminder(id: string, userId: string): Promise<void> {
        const appointment = await this.appointmentRepository.findById(id);

        if (!appointment) {
            throw new AppError('Randevu bulunamadı.', ErrorCodes.NOT_FOUND, 404);
        }

        // Simülasyon: Asıl gönderme işlemi
        console.log(`[SERVICE] Hatırlatma kuyruğa eklendi: ${appointment.candidateName}`);

        await this.appointmentRepository.markReminderSent(id);
    }
}
