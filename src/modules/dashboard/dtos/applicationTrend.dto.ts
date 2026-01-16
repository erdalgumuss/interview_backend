// src/modules/dashboard/dtos/applicationTrend.dto.ts

/**
 * Başvuru trend bilgileri - haftalık ortalama ve yüzdelik değişim
 */
export interface ApplicationTrendDTO {
  currentWeekApplications: number;
  previousWeekApplications: number;
  weeklyAverage: number;
  percentageChange: number; // Pozitif artış, negatif düşüş
  trendDirection: 'up' | 'down' | 'stable'; // Trend yönü
}

export class ApplicationTrend implements ApplicationTrendDTO {
  currentWeekApplications: number;
  previousWeekApplications: number;
  weeklyAverage: number;
  percentageChange: number;
  trendDirection: 'up' | 'down' | 'stable';

  constructor(data: ApplicationTrendDTO) {
    this.currentWeekApplications = data.currentWeekApplications;
    this.previousWeekApplications = data.previousWeekApplications;
    this.weeklyAverage = data.weeklyAverage;
    this.percentageChange = data.percentageChange;
    this.trendDirection = data.trendDirection;
  }
}

/**
 * Haftalık trend grafiği için veri noktası
 */
export interface WeeklyTrendDataPoint {
  week: string; // "2026-W01", "2026-W02" formatında
  weekLabel: string; // "1. Hafta", "2. Hafta" gibi
  applicationCount: number;
  startDate: Date;
  endDate: Date;
}

export class WeeklyTrendData implements WeeklyTrendDataPoint {
  week: string;
  weekLabel: string;
  applicationCount: number;
  startDate: Date;
  endDate: Date;

  constructor(data: WeeklyTrendDataPoint) {
    this.week = data.week;
    this.weekLabel = data.weekLabel;
    this.applicationCount = data.applicationCount;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
  }
}
