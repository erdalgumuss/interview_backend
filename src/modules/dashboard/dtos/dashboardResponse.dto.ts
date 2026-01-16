// src/modules/dashboard/dtos/dashboardResponse.dto.ts

import { DashboardStatsDTO } from './dashboardStats.dto';
import { ApplicationTrendDTO, WeeklyTrendDataPoint } from './applicationTrend.dto';
import { RecentApplicationDTO } from './recentApplication.dto';
import { ActiveInterviewDTO } from './activeInterview.dto';
import { DepartmentStatsDTO } from './departmentStats.dto';

/**
 * Dashboard ana response - tüm dashboard verilerini içerir
 */
export interface DashboardResponseDTO {
  // Genel istatistikler
  stats: DashboardStatsDTO;
  
  // Haftalık trend bilgisi
  applicationTrend: ApplicationTrendDTO;
  
  // Haftalık trend grafiği verisi (son 4 hafta)
  weeklyTrends: WeeklyTrendDataPoint[];
  
  // Son gelen başvurular (default 10 adet)
  recentApplications: RecentApplicationDTO[];
  
  // Aktif mülakatlar (default 10 adet)
  activeInterviews: ActiveInterviewDTO[];
  
  // Departmana göre başvurular
  departmentStats: DepartmentStatsDTO[];
  
  // Favori adaylar
  favoriteApplications: RecentApplicationDTO[];
  
  // Son bildirimler (henüz bildirim servisi yok, boş array)
  notifications: any[];
  
  // Status dağılımı (grafik için)
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

export class DashboardResponse implements DashboardResponseDTO {
  stats: DashboardStatsDTO;
  applicationTrend: ApplicationTrendDTO;
  weeklyTrends: WeeklyTrendDataPoint[];
  recentApplications: RecentApplicationDTO[];
  activeInterviews: ActiveInterviewDTO[];
  departmentStats: DepartmentStatsDTO[];
  favoriteApplications: RecentApplicationDTO[];
  notifications: any[];
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];

  constructor(data: DashboardResponseDTO) {
    this.stats = data.stats;
    this.applicationTrend = data.applicationTrend;
    this.weeklyTrends = data.weeklyTrends;
    this.recentApplications = data.recentApplications;
    this.activeInterviews = data.activeInterviews;
    this.departmentStats = data.departmentStats;
    this.favoriteApplications = data.favoriteApplications;
    this.notifications = data.notifications;
    this.statusDistribution = data.statusDistribution;
  }
}
