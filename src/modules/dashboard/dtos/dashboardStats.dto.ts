// src/modules/dashboard/dtos/dashboardStats.dto.ts

/**
 * Toplam başvuru istatistikleri
 */
export interface DashboardStatsDTO {
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  completedApplications: number;
}

export class DashboardStats implements DashboardStatsDTO {
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  completedApplications: number;

  constructor(data: DashboardStatsDTO) {
    this.totalApplications = data.totalApplications;
    this.acceptedApplications = data.acceptedApplications;
    this.rejectedApplications = data.rejectedApplications;
    this.pendingApplications = data.pendingApplications;
    this.completedApplications = data.completedApplications;
  }
}
