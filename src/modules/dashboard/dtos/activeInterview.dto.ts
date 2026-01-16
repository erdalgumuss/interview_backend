// src/modules/dashboard/dtos/activeInterview.dto.ts

import { InterviewStatus } from '../../interview/models/interview.model';

/**
 * Aktif mülakatlar için detaylı bilgi (10 alan içeriyor)
 */
export interface ActiveInterviewDTO {
  id: string;
  title: string;
  department?: string;
  status: InterviewStatus;
  questionCount: number; // Toplam soru sayısı
  totalApplications: number; // Bu mülakata yapılan toplam başvuru
  pendingApplications: number; // Bekleyen başvurular
  completedApplications: number; // Tamamlanan başvurular
  averageAIScore?: number; // Ortalama AI skoru
  totalDuration: number; // Toplam mülakat süresi (dakika cinsinden)
  expirationDate: Date;
  createdAt: Date;
}

export class ActiveInterview implements ActiveInterviewDTO {
  id: string;
  title: string;
  department?: string;
  status: InterviewStatus;
  questionCount: number;
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  averageAIScore?: number;
  totalDuration: number;
  expirationDate: Date;
  createdAt: Date;

  constructor(data: ActiveInterviewDTO) {
    this.id = data.id;
    this.title = data.title;
    this.department = data.department;
    this.status = data.status;
    this.questionCount = data.questionCount;
    this.totalApplications = data.totalApplications;
    this.pendingApplications = data.pendingApplications;
    this.completedApplications = data.completedApplications;
    this.averageAIScore = data.averageAIScore;
    this.totalDuration = data.totalDuration;
    this.expirationDate = data.expirationDate;
    this.createdAt = data.createdAt;
  }
}
