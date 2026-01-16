// src/modules/dashboard/repositories/dashboard.repository.ts

import mongoose from 'mongoose';
import ApplicationModel, { ApplicationStatus } from '../../application/models/application.model';
import InterviewModel, { InterviewStatus } from '../../interview/models/interview.model';

/**
 * Dashboard Repository - Dashboard için gerekli tüm database sorgularını içerir
 */
export class DashboardRepository {
  
  /**
   * Toplam başvuru istatistiklerini getirir
   * @param userId - İK kullanıcısının ID'si (kendi oluşturduğu mülakatlar için)
   */
  public async getTotalApplicationStats(userId: string) {
    // Kullanıcının oluşturduğu mülakatları bul
    const userInterviews = await InterviewModel.find({
      'createdBy.userId': new mongoose.Types.ObjectId(userId)
    }).select('_id');

    const interviewIds = userInterviews.map(i => i._id);

    // Bu mülakatların başvurularını aggregate et
    const stats = await ApplicationModel.aggregate([
      {
        $match: {
          interviewId: { $in: interviewIds }
        }
      },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          acceptedApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          rejectedApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pendingApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalApplications: 0,
      acceptedApplications: 0,
      rejectedApplications: 0,
      pendingApplications: 0,
      completedApplications: 0
    };
  }

  /**
   * Haftalık başvuru trendlerini getirir
   * @param userId - İK kullanıcısının ID'si
   * @param weeksCount - Kaç haftalık veri getirileceği (default: 4)
   */
  public async getWeeklyApplicationTrends(userId: string, weeksCount: number = 4) {
    const userInterviews = await InterviewModel.find({
      'createdBy.userId': new mongoose.Types.ObjectId(userId)
    }).select('_id');

    const interviewIds = userInterviews.map(i => i._id);

    // Son N hafta için başlangıç tarihi hesapla
    const now = new Date();
    const weeksAgo = new Date(now);
    weeksAgo.setDate(weeksAgo.getDate() - (weeksCount * 7));

    const trends = await ApplicationModel.aggregate([
      {
        $match: {
          interviewId: { $in: interviewIds },
          createdAt: { $gte: weeksAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$createdAt' },
            week: { $isoWeek: '$createdAt' }
          },
          applicationCount: { $sum: 1 },
          firstDate: { $min: '$createdAt' },
          lastDate: { $max: '$createdAt' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          week: '$_id.week',
          applicationCount: 1,
          firstDate: 1,
          lastDate: 1
        }
      }
    ]);

    return trends;
  }

  /**
   * Bu hafta ve geçen haftanın başvuru sayılarını karşılaştırır
   * @param userId - İK kullanıcısının ID'si
   */
  public async getApplicationTrendComparison(userId: string) {
    const userInterviews = await InterviewModel.find({
      'createdBy.userId': new mongoose.Types.ObjectId(userId)
    }).select('_id');

    const interviewIds = userInterviews.map(i => i._id);

    const now = new Date();
    
    // Bu haftanın başlangıcı (Pazartesi)
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + diffToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Geçen haftanın başlangıcı
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Geçen haftanın bitişi
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setMilliseconds(-1);

    const [currentWeekCount, previousWeekCount] = await Promise.all([
      // Bu hafta
      ApplicationModel.countDocuments({
        interviewId: { $in: interviewIds },
        createdAt: { $gte: currentWeekStart }
      }),
      // Geçen hafta
      ApplicationModel.countDocuments({
        interviewId: { $in: interviewIds },
        createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd }
      })
    ]);

    return {
      currentWeekApplications: currentWeekCount,
      previousWeekApplications: previousWeekCount
    };
  }

  /**
   * Son başvuruları getirir
   * @param userId - İK kullanıcısının ID'si
   * @param limit - Kaç başvuru getirileceği
   */
  public async getRecentApplications(userId: string, limit: number = 10) {
    const userInterviews = await InterviewModel.find({
      'createdBy.userId': new mongoose.Types.ObjectId(userId)
    }).select('_id');

    const interviewIds = userInterviews.map(i => i._id);

    const applications = await ApplicationModel.find({
      interviewId: { $in: interviewIds }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('interviewId', 'title')
      .lean()
      .exec();

    return applications;
  }

  /**
   * Aktif mülakatları başvuru sayıları ile birlikte getirir
   * @param userId - İK kullanıcısının ID'si
   * @param limit - Kaç mülakat getirileceği
   */
  public async getActiveInterviews(userId: string, limit: number = 10) {
    const activeInterviews = await InterviewModel.aggregate([
      {
        $match: {
          'createdBy.userId': new mongoose.Types.ObjectId(userId),
          status: { $in: [InterviewStatus.ACTIVE, InterviewStatus.PUBLISHED] }
        }
      },
      {
        $lookup: {
          from: 'applications', // Collection name
          localField: '_id',
          foreignField: 'interviewId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          questionCount: { $size: '$questions' },
          totalApplications: { $size: '$applications' },
          pendingApplications: {
            $size: {
              $filter: {
                input: '$applications',
                as: 'app',
                cond: { $in: ['$$app.status', ['pending', 'awaiting_video_responses', 'in_progress', 'awaiting_ai_analysis']] }
              }
            }
          },
          completedApplications: {
            $size: {
              $filter: {
                input: '$applications',
                as: 'app',
                cond: { $eq: ['$$app.status', 'completed'] }
              }
            }
          },
          totalDuration: {
            $reduce: {
              input: '$questions',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.duration'] }
            }
          },
          averageAIScore: {
            $avg: '$applications.generalAIAnalysis.overallScore'
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          applications: 0, // Applications array'ini response'dan çıkar
          questions: 0 // Questions array'ini de çıkar (sadece count yeterli)
        }
      }
    ]);

    return activeInterviews;
  }

  /**
   * Departmana göre başvuru istatistiklerini getirir
   * @param userId - İK kullanıcısının ID'si
   */
  public async getApplicationsByDepartment(userId: string) {
    const departmentStats = await InterviewModel.aggregate([
      {
        $match: {
          'createdBy.userId': new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'interviewId',
          as: 'applications'
        }
      },
      {
        $group: {
          _id: '$department',
          totalApplications: { $sum: { $size: '$applications' } },
          activeInterviews: {
            $sum: {
              $cond: [
                { $in: ['$status', [InterviewStatus.ACTIVE, InterviewStatus.PUBLISHED]] },
                1,
                0
              ]
            }
          },
          applications: { $push: '$applications' }
        }
      },
      {
        $addFields: {
          allApplications: {
            $reduce: {
              input: '$applications',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          }
        }
      },
      {
        $addFields: {
          acceptedApplications: {
            $size: {
              $filter: {
                input: '$allApplications',
                as: 'app',
                cond: { $eq: ['$$app.status', 'accepted'] }
              }
            }
          },
          rejectedApplications: {
            $size: {
              $filter: {
                input: '$allApplications',
                as: 'app',
                cond: { $eq: ['$$app.status', 'rejected'] }
              }
            }
          },
          pendingApplications: {
            $size: {
              $filter: {
                input: '$allApplications',
                as: 'app',
                cond: { $in: ['$$app.status', ['pending', 'awaiting_video_responses', 'in_progress', 'awaiting_ai_analysis']] }
              }
            }
          },
          averageAIScore: {
            $avg: '$allApplications.generalAIAnalysis.overallScore'
          }
        }
      },
      {
        $project: {
          _id: 0,
          department: { $ifNull: ['$_id', 'Diğer'] },
          totalApplications: 1,
          acceptedApplications: 1,
          rejectedApplications: 1,
          pendingApplications: 1,
          averageAIScore: 1,
          activeInterviews: 1
        }
      },
      {
        $sort: { totalApplications: -1 }
      }
    ]);

    return departmentStats;
  }

  /**
   * Favori adayları getirir
   * @param userId - İK kullanıcısının ID'si
   */
  public async getFavoriteApplications(userId: string) {
    const favoriteApplications = await ApplicationModel.find({
      favoritedBy: new mongoose.Types.ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .populate('interviewId', 'title')
      .lean()
      .exec();

    return favoriteApplications;
  }

  /**
   * Başvuru status dağılımını getirir (grafik için)
   * @param userId - İK kullanıcısının ID'si
   */
  public async getApplicationStatusDistribution(userId: string) {
    const userInterviews = await InterviewModel.find({
      'createdBy.userId': new mongoose.Types.ObjectId(userId)
    }).select('_id');

    const interviewIds = userInterviews.map(i => i._id);

    const distribution = await ApplicationModel.aggregate([
      {
        $match: {
          interviewId: { $in: interviewIds }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      }
    ]);

    return distribution;
  }

  /**
   * Favori toggle işlemi - favorilere ekle veya çıkar
   * @param userId - İK kullanıcısının ID'si
   * @param applicationId - Başvuru ID'si
   */
  public async toggleFavoriteApplication(userId: string, applicationId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const application = await ApplicationModel.findById(applicationId);

    if (!application) {
      return null;
    }

    // Kullanıcı favorilerde mi kontrol et
    const isFavorited = application.favoritedBy.some(
      (id) => id.toString() === userId
    );

    if (isFavorited) {
      // Favorilerden çıkar
      application.favoritedBy = application.favoritedBy.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Favorilere ekle
      application.favoritedBy.push(userObjectId);
    }

    await application.save();
    return application;
  }
}
