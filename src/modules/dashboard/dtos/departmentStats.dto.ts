// src/modules/dashboard/dtos/departmentStats.dto.ts

/**
 * Departmana göre başvuru istatistikleri
 */
export interface DepartmentStatsDTO {
  department: string; // Departman adı (IT, İK, Satış, vb.)
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageAIScore?: number; // Departman ortalaması
  activeInterviews: number; // Bu departmana ait aktif mülakat sayısı
}

export class DepartmentStats implements DepartmentStatsDTO {
  department: string;
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageAIScore?: number;
  activeInterviews: number;

  constructor(data: DepartmentStatsDTO) {
    this.department = data.department;
    this.totalApplications = data.totalApplications;
    this.acceptedApplications = data.acceptedApplications;
    this.rejectedApplications = data.rejectedApplications;
    this.pendingApplications = data.pendingApplications;
    this.averageAIScore = data.averageAIScore;
    this.activeInterviews = data.activeInterviews;
  }
}
