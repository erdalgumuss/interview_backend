// src/modules/dashboard/dtos/recentApplication.dto.ts

import { ApplicationStatus } from '../../application/models/application.model';

/**
 * Son başvurular için özet bilgiler
 */
export interface RecentApplicationDTO {
  id: string;
  candidateName: string;
  candidateEmail: string;
  interviewTitle: string;
  interviewId: string;
  status: ApplicationStatus;
  aiScore?: number; // Overall AI analiz skoru
  appliedAt: Date;
  isFavorite: boolean; // Kullanıcı için favori mi?
}

export class RecentApplication implements RecentApplicationDTO {
  id: string;
  candidateName: string;
  candidateEmail: string;
  interviewTitle: string;
  interviewId: string;
  status: ApplicationStatus;
  aiScore?: number;
  appliedAt: Date;
  isFavorite: boolean;

  constructor(data: RecentApplicationDTO) {
    this.id = data.id;
    this.candidateName = data.candidateName;
    this.candidateEmail = data.candidateEmail;
    this.interviewTitle = data.interviewTitle;
    this.interviewId = data.interviewId;
    this.status = data.status;
    this.aiScore = data.aiScore;
    this.appliedAt = data.appliedAt;
    this.isFavorite = data.isFavorite;
  }
}
