// src/modules/dashboard/services/dashboard.service.ts

import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardResponseDTO } from '../dtos/dashboardResponse.dto';
import { DashboardStats } from '../dtos/dashboardStats.dto';
import { ApplicationTrend, WeeklyTrendData } from '../dtos/applicationTrend.dto';
import { RecentApplication } from '../dtos/recentApplication.dto';
import { ActiveInterview } from '../dtos/activeInterview.dto';
import { DepartmentStats } from '../dtos/departmentStats.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';

/**
 * Dashboard Service - Dashboard business logic'ini yönetir
 */
export class DashboardService {
  private dashboardRepository: DashboardRepository;

  constructor() {
    this.dashboardRepository = new DashboardRepository();
  }

  /**
   * Tüm dashboard verilerini getirir
   * @param userId - İK kullanıcısının ID'si
   */
  public async getDashboardData(userId: string): Promise<DashboardResponseDTO> {
    try {
      // Paralel olarak tüm verileri çek (performans için)
      const [
        statsData,
        trendComparison,
        weeklyTrendsData,
        recentApplicationsData,
        activeInterviewsData,
        departmentStatsData,
        favoriteApplicationsData,
        statusDistributionData
      ] = await Promise.all([
        this.dashboardRepository.getTotalApplicationStats(userId),
        this.dashboardRepository.getApplicationTrendComparison(userId),
        this.dashboardRepository.getWeeklyApplicationTrends(userId, 4),
        this.dashboardRepository.getRecentApplications(userId, 10),
        this.dashboardRepository.getActiveInterviews(userId, 10),
        this.dashboardRepository.getApplicationsByDepartment(userId),
        this.dashboardRepository.getFavoriteApplications(userId),
        this.dashboardRepository.getApplicationStatusDistribution(userId)
      ]);

      // Stats DTO'ya dönüştür
      const stats = new DashboardStats(statsData);

      // Trend hesaplaması yap
      const applicationTrend = this.calculateApplicationTrend(
        trendComparison.currentWeekApplications,
        trendComparison.previousWeekApplications,
        weeklyTrendsData
      );

      // Haftalık trendleri formatla
      const weeklyTrends = this.formatWeeklyTrends(weeklyTrendsData);

      // Son başvuruları formatla
      const recentApplications = this.formatRecentApplications(recentApplicationsData, userId);

      // Aktif mülakatları formatla
      const activeInterviews = this.formatActiveInterviews(activeInterviewsData);

      // Departman istatistiklerini formatla
      const departmentStats = this.formatDepartmentStats(departmentStatsData);

      // Favori başvuruları formatla
      const favoriteApplications = this.formatRecentApplications(favoriteApplicationsData, userId);

      // Status dağılımını hesapla (yüzdelik olarak)
      const statusDistribution = this.calculateStatusDistribution(
        statusDistributionData,
        stats.totalApplications
      );

      // Bildirimler (henüz bildirim servisi yok, boş array)
      const notifications: any[] = [];

      return {
        stats,
        applicationTrend,
        weeklyTrends,
        recentApplications,
        activeInterviews,
        departmentStats,
        favoriteApplications,
        notifications,
        statusDistribution
      };

    } catch (error) {
      console.error('Dashboard data error:', error);
      throw new AppError(
        'Dashboard verisi alınırken bir hata oluştu',
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Başvuru trendini hesaplar (yüzdelik değişim ve yön)
   */
  private calculateApplicationTrend(
    currentWeek: number,
    previousWeek: number,
    weeklyData: any[]
  ): ApplicationTrend {
    // Haftalık ortalama hesapla
    const totalApplications = weeklyData.reduce((sum, week) => sum + week.applicationCount, 0);
    const weeklyAverage = weeklyData.length > 0 ? totalApplications / weeklyData.length : 0;

    // Yüzdelik değişim hesapla
    let percentageChange = 0;
    if (previousWeek > 0) {
      percentageChange = ((currentWeek - previousWeek) / previousWeek) * 100;
    } else if (currentWeek > 0) {
      percentageChange = 100; // Önceki hafta 0, bu hafta var ise %100 artış
    }

    // Trend yönünü belirle
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 5) {
      trendDirection = 'up';
    } else if (percentageChange < -5) {
      trendDirection = 'down';
    }

    return new ApplicationTrend({
      currentWeekApplications: currentWeek,
      previousWeekApplications: previousWeek,
      weeklyAverage: Math.round(weeklyAverage * 10) / 10, // 1 ondalık basamak
      percentageChange: Math.round(percentageChange * 10) / 10, // 1 ondalık basamak
      trendDirection
    });
  }

  /**
   * Haftalık trend verilerini formatlar
   */
  private formatWeeklyTrends(weeklyData: any[]): WeeklyTrendData[] {
    return weeklyData.map((week, index) => {
      const weekLabel = `${index + 1}. Hafta`;
      const weekString = `${week.year}-W${String(week.week).padStart(2, '0')}`;

      // Hafta başlangıç ve bitiş tarihlerini hesapla
      const startDate = this.getDateOfISOWeek(week.week, week.year);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      return new WeeklyTrendData({
        week: weekString,
        weekLabel,
        applicationCount: week.applicationCount,
        startDate,
        endDate
      });
    });
  }

  /**
   * ISO hafta numarasından tarih hesaplar
   */
  private getDateOfISOWeek(week: number, year: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const isoWeekStart = simple;
    
    if (dayOfWeek <= 4) {
      isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    return isoWeekStart;
  }

  /**
   * Son başvuruları formatlar
   */
  private formatRecentApplications(applications: any[], userId: string): RecentApplication[] {
    return applications.map(app => {
      const isFavorite = app.favoritedBy?.some(
        (id: mongoose.Types.ObjectId) => id.toString() === userId
      ) || false;

      return new RecentApplication({
        id: app._id.toString(),
        candidateName: `${app.candidate.name} ${app.candidate.surname}`,
        candidateEmail: app.candidate.email,
        interviewTitle: app.interviewId?.title || 'Bilinmeyen Mülakat',
        interviewId: app.interviewId?._id?.toString() || '',
        status: app.status,
        aiScore: app.generalAIAnalysis?.overallScore,
        appliedAt: app.createdAt,
        isFavorite
      });
    });
  }

  /**
   * Aktif mülakatları formatlar
   */
  private formatActiveInterviews(interviews: any[]): ActiveInterview[] {
    return interviews.map(interview => {
      return new ActiveInterview({
        id: interview._id.toString(),
        title: interview.title,
        department: interview.department,
        status: interview.status,
        questionCount: interview.questionCount || 0,
        totalApplications: interview.totalApplications || 0,
        pendingApplications: interview.pendingApplications || 0,
        completedApplications: interview.completedApplications || 0,
        averageAIScore: interview.averageAIScore 
          ? Math.round(interview.averageAIScore * 10) / 10 
          : undefined,
        totalDuration: interview.totalDuration || 0,
        expirationDate: interview.expirationDate,
        createdAt: interview.createdAt
      });
    });
  }

  /**
   * Departman istatistiklerini formatlar
   */
  private formatDepartmentStats(departments: any[]): DepartmentStats[] {
    return departments.map(dept => {
      return new DepartmentStats({
        department: dept.department,
        totalApplications: dept.totalApplications,
        acceptedApplications: dept.acceptedApplications,
        rejectedApplications: dept.rejectedApplications,
        pendingApplications: dept.pendingApplications,
        averageAIScore: dept.averageAIScore 
          ? Math.round(dept.averageAIScore * 10) / 10 
          : undefined,
        activeInterviews: dept.activeInterviews
      });
    });
  }

  /**
   * Status dağılımını yüzdelik olarak hesaplar
   */
  private calculateStatusDistribution(distribution: any[], total: number) {
    return distribution.map(item => ({
      status: item.status,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0 // 1 ondalık basamak
    }));
  }

  /**
   * Favori toggle işlemi
   * @param userId - İK kullanıcısının ID'si
   * @param applicationId - Başvuru ID'si
   */
  public async toggleFavoriteApplication(userId: string, applicationId: string) {
    try {
      const result = await this.dashboardRepository.toggleFavoriteApplication(
        userId,
        applicationId
      );

      if (!result) {
        throw new AppError(
          'Başvuru bulunamadı',
          ErrorCodes.NOT_FOUND,
          404
        );
      }

      const isFavorite = result.favoritedBy.some(
        (id) => id.toString() === userId
      );

      return {
        success: true,
        isFavorite,
        message: isFavorite 
          ? 'Başvuru favorilere eklendi' 
          : 'Başvuru favorilerden çıkarıldı'
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Toggle favorite error:', error);
      throw new AppError(
        'Favori işlemi sırasında bir hata oluştu',
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Tarih filtresine göre trend verilerini getirir
   * @param userId - İK kullanıcısının ID'si
   * @param startDate - Başlangıç tarihi (optional)
   * @param endDate - Bitiş tarihi (optional)
   */
  public async getApplicationTrendsFiltered(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      // Eğer tarih belirtilmemişse, son 4 haftayı kullan
      const weeksCount = 4;
      const weeklyTrendsData = await this.dashboardRepository.getWeeklyApplicationTrends(
        userId,
        weeksCount
      );

      const weeklyTrends = this.formatWeeklyTrends(weeklyTrendsData);

      return {
        weeklyTrends,
        totalApplications: weeklyTrendsData.reduce((sum, week) => sum + week.applicationCount, 0)
      };

    } catch (error) {
      console.error('Get trends error:', error);
      throw new AppError(
        'Trend verileri alınırken bir hata oluştu',
        ErrorCodes.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }
}
