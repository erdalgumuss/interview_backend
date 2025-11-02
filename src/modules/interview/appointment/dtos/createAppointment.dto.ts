import { IsString, IsEnum, IsNumber, IsBoolean, IsDateString, IsNotEmpty, Min } from 'class-validator';

// Randevu türleri frontend'deki enum'a (interview, followup) uygun
export enum AppointmentType {
    INTERVIEW = 'interview',
    FOLLOWUP = 'followup',
}

export class CreateAppointmentDTO {
    // TS2564 hatasını çözmek için '!' operatörü eklendi
    @IsNotEmpty()
    @IsString()
    candidateName!: string; 

    @IsNotEmpty()
    @IsEnum(AppointmentType)
    type!: AppointmentType;

    // Frontend'den ISO string olarak gelir (date ve time birleştirilmiş)
    @IsNotEmpty()
    @IsDateString()
    date!: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(15)
    duration!: number; // Dakika cinsinden

    @IsBoolean()
    sendEmail!: boolean;

    @IsBoolean()
    sendSMS!: boolean;
}
