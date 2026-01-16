import AppointmentModel, { IAppointment } from '../models/appointment.model';

export class AppointmentRepository {
  /**
   * Yeni bir randevu kaydı oluştur.
   */
  public async create(data: Partial<IAppointment>): Promise<IAppointment> {
    const appointment = new AppointmentModel(data);
    return appointment.save();
  }

  /**
   * Tüm randevuları getir (silinmemiş olanlar).
   * Gelecekte kullanıcı ID'sine göre filtrelenmelidir.
   */
  public async findAll(): Promise<IAppointment[]> {
    // Randevuların silinme mantığı yoktur, tüm aktif randevuları getirir.
    return AppointmentModel.find({}) 
      .populate('createdBy', 'name email') // Randevuyu oluşturan IK yetkilisi bilgisi çekilebilir.
      .sort({ date: 1 }) // Tarihe göre sırala
      .exec();
  }

  /**
   * ID ile randevuyu getir.
   */
  public async findById(appointmentId: string): Promise<IAppointment | null> {
    return AppointmentModel.findById(appointmentId).exec();
  }

  /**
   * Randevuyu sil (Tamamen silme).
   */
  public async delete(appointmentId: string): Promise<IAppointment | null> {
    // Randevular genellikle soft-delete yapılmaz, tamamen silinir.
    return AppointmentModel.findByIdAndDelete(appointmentId).exec();
  }

  /**
   * Randevu hatırlatma durumunu günceller.
   */
  public async markReminderSent(appointmentId: string): Promise<IAppointment | null> {
    return AppointmentModel.findByIdAndUpdate(
      appointmentId,
      { isReminderSent: true },
      { new: true } // Güncellenmiş belgeyi döndür
    ).exec();
  }
  
  /**
   * Randevuyu güncelle.
   */
  public async update(
    appointmentId: string,
    updateData: Partial<IAppointment>
  ): Promise<IAppointment | null> {
    return AppointmentModel.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    ).exec();
  }
}