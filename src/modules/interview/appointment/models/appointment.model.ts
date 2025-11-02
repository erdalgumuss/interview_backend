import mongoose, { Document, Schema } from 'mongoose';
import { AppointmentType } from '../dtos/createAppointment.dto';

export interface IAppointment extends Document {
    candidateName: string;
    type: AppointmentType;
    date: Date; // Veritabanında Date objesi olarak saklanacak
    duration: number;
    createdBy: mongoose.Schema.Types.ObjectId; // Hangi IK/Admin kullanıcısı oluşturdu
    isReminderSent: boolean; // Hatırlatma gönderildi mi?
    createdAt: Date;
    updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
    {
        candidateName: { type: String, required: true },
        type: { 
            type: String, 
            enum: Object.values(AppointmentType), 
            required: true 
        },
        date: { type: Date, required: true }, // Randevu zamanı
        duration: { type: Number, required: true, min: 15 },
        createdBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', // Auth modülündeki User modeline referans
            required: true 
        },
        isReminderSent: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
