import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';

export enum AppointmentType {
  INTERVIEW = 'interview',
  FOLLOWUP = 'followup',
}
export class CreateAppointmentDTO {

candidateName!: string;
type!: AppointmentType;
date!: string; // ISO tarih formatında bekleniyor
duration!: number; // Dakika cinsinden
sendEmail!: boolean;
sendSMS!: boolean;
}
