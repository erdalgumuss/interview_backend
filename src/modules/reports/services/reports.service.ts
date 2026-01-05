// src/modules/reports/services/reports.service.ts

import mongoose from 'mongoose';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import AIAnalysisModel from '../../aiAnalysis/models/aiAnalysis.model';
import {
    IReportFilters,
    ISummaryResponse,
    IPositionDistributionResponse,
    IPositionDistributionItem,
    IFitDistributionResponse,
    IFitBucket,
    ISkillScatterPoint,
    IQuestionEffectivenessResponse,
    IQuestionEffectivenessItem,
    IAIHRAlignmentResponse,
    ITimeTrendsResponse,
    ITimeTrendItem
} from '../types/reports.types';

/**
 * Reports Service
 * 
 * Tüm report endpoint'leri için aggregate query'ler.
 * Read-only, candidate-level veri expose etmez.
 */
class ReportsService {

    // ================================
    // FİLTRE BUILDER
    // ================================

    /**
     * Ortak MongoDB match stage builder
     */
    private buildMatchStage(filters: IReportFilters, collection: 'applications' | 'interviews' | 'aiAnalysis'): any {
        const match: any = {};

        // Tarih filtresi
        if (filters.startDate || filters.endDate) {
            match.createdAt = {};
            if (filters.startDate) {
                match.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                match.createdAt.$lte = new Date(filters.endDate);
            }
        }

        // Mülakat ID filtresi
        if (filters.interviewIds && filters.interviewIds.length > 0) {
            const interviewObjectIds = filters.interviewIds.map(id => new mongoose.Types.ObjectId(id));
            if (collection === 'applications') {
                match.interviewId = { $in: interviewObjectIds };
            } else if (collection === 'interviews') {
                match._id = { $in: interviewObjectIds };
            }
        }

        // Status filtresi (sadece applications için)
        if (collection === 'applications' && filters.status && filters.status.length > 0) {
            match.status = { $in: filters.status };
        }

        return match;
    }

    // ================================
    // 3.1 ÖZET KPI ŞERİDİ
    // ================================

    /**
     * GET /reports/summary
     * Genel KPI metrikleri
     */
    async getSummary(filters: IReportFilters): Promise<ISummaryResponse> {
        const matchStage = this.buildMatchStage(filters, 'applications');

        // Applications aggregate
        const applicationStats = await ApplicationModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalApplications: { $sum: 1 },
                    completedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pendingCount: {
                        $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress', 'awaiting_video_responses']] }, 1, 0] }
                    },
                    avgOverallScore: { $avg: '$generalAIAnalysis.overallScore' },
                    avgTechnicalScore: { $avg: '$generalAIAnalysis.technicalSkillsScore' },
                    avgCommunicationScore: { $avg: '$generalAIAnalysis.communicationScore' }
                }
            }
        ]);

        // Interviews count
        const interviewMatchStage = this.buildMatchStage(filters, 'interviews');
        const interviewStats = await InterviewModel.aggregate([
            { $match: interviewMatchStage },
            {
                $group: {
                    _id: null,
                    totalInterviews: { $sum: 1 },
                    activeInterviews: {
                        $sum: { $cond: [{ $in: ['$status', ['active', 'published']] }, 1, 0] }
                    }
                }
            }
        ]);

        // AI Analysis stats (evaluated count)
        const aiStats = await AIAnalysisModel.aggregate([
            { $match: { pipelineStatus: 'done', ...this.buildMatchStage(filters, 'aiAnalysis') } },
            {
                $group: {
                    _id: '$applicationId'
                }
            },
            { $count: 'evaluatedCount' }
        ]);

        const appStats = applicationStats[0] || {};
        const intStats = interviewStats[0] || {};
        const evaluatedCount = aiStats[0]?.evaluatedCount || 0;

        return {
            totalInterviews: intStats.totalInterviews || 0,
            evaluatedInterviews: evaluatedCount,
            pendingInterviews: appStats.pendingCount || 0,
            completedApplications: appStats.completedCount || 0,
            favoriteRatio: 0, // HR actions entegrasyonu sonra eklenecek
            avgOverallScore: Math.round((appStats.avgOverallScore || 0) * 100) / 100,
            avgTechnicalScore: Math.round((appStats.avgTechnicalScore || 0) * 100) / 100,
            avgCommunicationScore: Math.round((appStats.avgCommunicationScore || 0) * 100) / 100,
            avgInterviewDurationSec: 0 // Video duration aggregate sonra eklenecek
        };
    }

    // ================================
    // 3.2 POZİSYON BAZLI DAĞILIM
    // ================================

    /**
     * GET /reports/position-distribution
     * Pozisyonlara göre aday dağılımı
     */
    async getPositionDistribution(filters: IReportFilters): Promise<IPositionDistributionResponse> {
        const matchStage = this.buildMatchStage(filters, 'applications');

        const distribution = await ApplicationModel.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'interviews',
                    localField: 'interviewId',
                    foreignField: '_id',
                    as: 'interview'
                }
            },
            { $unwind: '$interview' },
            {
                $group: {
                    _id: {
                        interviewId: '$interviewId',
                        title: '$interview.title',
                        department: '$interview.position.department'
                    },
                    totalApplications: { $sum: 1 },
                    highFit: {
                        $sum: {
                            $cond: [{ $gte: ['$generalAIAnalysis.overallScore', 70] }, 1, 0]
                        }
                    },
                    mediumFit: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ['$generalAIAnalysis.overallScore', 40] },
                                        { $lt: ['$generalAIAnalysis.overallScore', 70] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    lowFit: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $lt: ['$generalAIAnalysis.overallScore', 40] },
                                        { $eq: ['$generalAIAnalysis.overallScore', null] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { totalApplications: -1 } }
        ]);

        const positions: IPositionDistributionItem[] = distribution.map(item => ({
            positionId: item._id.interviewId.toString(),
            positionName: item._id.title || 'Belirtilmemiş',
            department: item._id.department,
            distribution: {
                highFit: item.highFit,
                mediumFit: item.mediumFit,
                lowFit: item.lowFit
            },
            totalApplications: item.totalApplications
        }));

        return { positions };
    }

    // ================================
    // 3.3 ROL YAKINLIĞI & YETKİNLİK DAĞILIMI
    // ================================

    /**
     * GET /reports/fit-distribution
     * Skor dağılımı ve yetkinlik scatter
     */
    async getFitDistribution(filters: IReportFilters): Promise<IFitDistributionResponse> {
        const matchStage = this.buildMatchStage(filters, 'applications');

        // Score bucket dağılımı
        const bucketAgg = await ApplicationModel.aggregate([
            { $match: { ...matchStage, 'generalAIAnalysis.overallScore': { $exists: true, $ne: null } } },
            {
                $bucket: {
                    groupBy: '$generalAIAnalysis.overallScore',
                    boundaries: [0, 30, 50, 70, 85, 101],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]);

        // Toplam sayı
        const totalCount = bucketAgg.reduce((sum, b) => sum + b.count, 0);

        // Bucket'ları format'la
        const bucketLabels: { [key: number]: string } = {
            0: '0-30 (Düşük)',
            30: '30-50 (Orta-Düşük)',
            50: '50-70 (Orta)',
            70: '70-85 (İyi)',
            85: '85-100 (Mükemmel)'
        };

        const roleFitBuckets: IFitBucket[] = bucketAgg
            .filter(b => b._id !== 'Other')
            .map(b => ({
                range: bucketLabels[b._id] || `${b._id}+`,
                count: b.count,
                percentage: totalCount > 0 ? Math.round((b.count / totalCount) * 100) : 0
            }));

        // Ortalama skorlar
        const avgScoresAgg = await ApplicationModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    avgTechnical: { $avg: '$generalAIAnalysis.technicalSkillsScore' },
                    avgCommunication: { $avg: '$generalAIAnalysis.communicationScore' },
                    avgProblemSolving: { $avg: '$generalAIAnalysis.problemSolvingScore' },
                    avgPersonality: { $avg: '$generalAIAnalysis.personalityMatchScore' }
                }
            }
        ]);

        const avgScores = avgScoresAgg[0] || {};

        // Skill scatter (anonymized - sadece skorlar, candidate bilgisi yok)
        const scatterAgg = await ApplicationModel.aggregate([
            { 
                $match: { 
                    ...matchStage, 
                    'generalAIAnalysis.technicalSkillsScore': { $exists: true },
                    'generalAIAnalysis.communicationScore': { $exists: true }
                } 
            },
            {
                $project: {
                    _id: 0,
                    technical: '$generalAIAnalysis.technicalSkillsScore',
                    communication: '$generalAIAnalysis.communicationScore',
                    problemSolving: '$generalAIAnalysis.problemSolvingScore'
                }
            },
            { $limit: 100 } // Scatter için maksimum 100 nokta
        ]);

        const skillScatter: ISkillScatterPoint[] = scatterAgg.map(s => ({
            communication: s.communication || 0,
            technical: s.technical || 0,
            problemSolving: s.problemSolving || 0
        }));

        return {
            roleFitBuckets,
            avgScores: {
                technical: Math.round((avgScores.avgTechnical || 0) * 100) / 100,
                communication: Math.round((avgScores.avgCommunication || 0) * 100) / 100,
                problemSolving: Math.round((avgScores.avgProblemSolving || 0) * 100) / 100,
                personality: Math.round((avgScores.avgPersonality || 0) * 100) / 100
            },
            skillScatter
        };
    }

    // ================================
    // 3.4 SORU BAZLI AYIRT EDİCİLİK
    // ================================

    /**
     * GET /reports/question-effectiveness
     * Her sorunun adayları ayırma gücü
     */
    async getQuestionEffectiveness(filters: IReportFilters): Promise<IQuestionEffectivenessResponse> {
        const matchStage = this.buildMatchStage(filters, 'aiAnalysis');

        const questionStats = await AIAnalysisModel.aggregate([
            { $match: { pipelineStatus: 'done', ...matchStage } },
            {
                $lookup: {
                    from: 'interviews',
                    let: { appId: '$applicationId' },
                    pipeline: [
                        {
                            $lookup: {
                                from: 'applications',
                                localField: '_id',
                                foreignField: 'interviewId',
                                as: 'apps'
                            }
                        }
                    ],
                    as: 'interviewData'
                }
            },
            {
                $group: {
                    _id: '$questionId',
                    avgScore: { $avg: '$overallScore' },
                    scores: { $push: '$overallScore' },
                    responseCount: { $sum: 1 },
                    avgDuration: { $avg: '$transcription.duration' },
                    completedCount: {
                        $sum: { $cond: [{ $eq: ['$pipelineStatus', 'done'] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    // Variance hesaplama (ayırt edicilik)
                    varianceScore: {
                        $cond: {
                            if: { $gt: [{ $size: '$scores' }, 1] },
                            then: {
                                $divide: [
                                    { $stdDevPop: '$scores' },
                                    100 // Normalize et
                                ]
                            },
                            else: 0
                        }
                    },
                    analysisCompletionRate: {
                        $cond: {
                            if: { $gt: ['$totalCount', 0] },
                            then: { $divide: ['$completedCount', '$totalCount'] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { varianceScore: -1 } },
            { $limit: 50 }
        ]);

        // Interview questions'dan soru text'lerini al
        const questionIds = questionStats.map(q => q._id);
        const interviews = await InterviewModel.find({
            'questions._id': { $in: questionIds }
        }).select('title questions');

        // Question text mapping
        const questionTextMap = new Map<string, { text: string; interviewTitle: string }>();
        interviews.forEach(interview => {
            interview.questions.forEach(q => {
                if (q._id) {
                    questionTextMap.set(q._id.toString(), {
                        text: q.questionText,
                        interviewTitle: interview.title
                    });
                }
            });
        });

        const questions: IQuestionEffectivenessItem[] = questionStats.map(q => {
            const questionInfo = questionTextMap.get(q._id?.toString()) || { text: 'Bilinmeyen Soru', interviewTitle: '' };
            return {
                questionId: q._id?.toString() || '',
                questionText: questionInfo.text,
                interviewTitle: questionInfo.interviewTitle,
                varianceScore: Math.round(q.varianceScore * 100) / 100,
                avgAnswerDurationSec: Math.round(q.avgDuration || 0),
                analysisCompletionRate: Math.round(q.analysisCompletionRate * 100) / 100,
                avgScore: Math.round(q.avgScore || 0),
                responseCount: q.responseCount
            };
        });

        return {
            questions,
            totalQuestions: questions.length
        };
    }

    // ================================
    // 3.5 AI – HR UYUM ANALİZİ
    // ================================

    /**
     * GET /reports/ai-hr-alignment
     * AI skorları ile HR kararları arasındaki uyum
     * Not: HR favorites/actions entegrasyonu gerekiyor
     */
    async getAIHRAlignment(filters: IReportFilters): Promise<IAIHRAlignmentResponse> {
        const matchStage = this.buildMatchStage(filters, 'applications');

        // AI yüksek skor threshold
        const HIGH_SCORE_THRESHOLD = 70;

        // Şu an için sadece AI skorlarına göre analiz
        // HR actions tablosu eklendiğinde genişletilecek
        const aiHighScoreCount = await ApplicationModel.countDocuments({
            ...matchStage,
            'generalAIAnalysis.overallScore': { $gte: HIGH_SCORE_THRESHOLD }
        });

        const totalEvaluated = await ApplicationModel.countDocuments({
            ...matchStage,
            'generalAIAnalysis.overallScore': { $exists: true, $ne: null }
        });

        // Status 'accepted' olanları HR favorite olarak kabul et (geçici)
        const hrAcceptedCount = await ApplicationModel.countDocuments({
            ...matchStage,
            status: 'accepted'
        });

        // Hem AI yüksek hem de accepted
        const bothHighCount = await ApplicationModel.countDocuments({
            ...matchStage,
            'generalAIAnalysis.overallScore': { $gte: HIGH_SCORE_THRESHOLD },
            status: 'accepted'
        });

        const aiOnlyHigh = aiHighScoreCount - bothHighCount;
        const hrOnlyFavorite = hrAcceptedCount - bothHighCount;

        const overlapRatio = totalEvaluated > 0 
            ? Math.round((bothHighCount / Math.max(aiHighScoreCount, hrAcceptedCount, 1)) * 100) / 100 
            : 0;

        return {
            overlapRatio,
            aiOnlyHigh: Math.max(aiOnlyHigh, 0),
            hrOnlyFavorite: Math.max(hrOnlyFavorite, 0),
            bothHigh: bothHighCount,
            totalEvaluated,
            alignmentTrend: [] // Trend verisi için daha fazla data gerekli
        };
    }

    // ================================
    // 3.6 ZAMAN BAZLI TRENDLER
    // ================================

    /**
     * GET /reports/time-trends
     * Zaman içinde metrik değişimleri
     */
    async getTimeTrends(
        filters: IReportFilters, 
        interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
    ): Promise<ITimeTrendsResponse> {
        const matchStage = this.buildMatchStage(filters, 'applications');

        // Date grouping format
        let dateFormat: any;
        switch (interval) {
            case 'daily':
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'weekly':
                dateFormat = {
                    $concat: [
                        { $toString: { $year: '$createdAt' } },
                        '-W',
                        { $toString: { $week: '$createdAt' } }
                    ]
                };
                break;
            case 'monthly':
                dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
        }

        const trendAgg = await ApplicationModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: dateFormat,
                    avgOverallScore: { $avg: '$generalAIAnalysis.overallScore' },
                    applicationCount: { $sum: 1 },
                    completedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    acceptedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
                    }
                }
            },
            {
                $addFields: {
                    completionRate: {
                        $cond: {
                            if: { $gt: ['$applicationCount', 0] },
                            then: { $divide: ['$completedCount', '$applicationCount'] },
                            else: 0
                        }
                    },
                    favoriteRatio: {
                        $cond: {
                            if: { $gt: ['$applicationCount', 0] },
                            then: { $divide: ['$acceptedCount', '$applicationCount'] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const trend: ITimeTrendItem[] = trendAgg.map(t => ({
            period: t._id,
            avgOverallScore: Math.round((t.avgOverallScore || 0) * 100) / 100,
            favoriteRatio: Math.round(t.favoriteRatio * 100) / 100,
            applicationCount: t.applicationCount,
            completionRate: Math.round(t.completionRate * 100) / 100
        }));

        // Summary hesapla
        let peakPeriod = '';
        let lowestPeriod = '';
        let maxScore = -1;
        let minScore = 101;
        let totalScoreChange = 0;

        trend.forEach((t, i) => {
            if (t.avgOverallScore > maxScore) {
                maxScore = t.avgOverallScore;
                peakPeriod = t.period;
            }
            if (t.avgOverallScore < minScore && t.avgOverallScore > 0) {
                minScore = t.avgOverallScore;
                lowestPeriod = t.period;
            }
            if (i > 0 && trend[i - 1].avgOverallScore > 0) {
                totalScoreChange += t.avgOverallScore - trend[i - 1].avgOverallScore;
            }
        });

        const avgScoreChange = trend.length > 1 
            ? Math.round((totalScoreChange / (trend.length - 1)) * 100) / 100 
            : 0;

        return {
            trend,
            interval,
            summary: {
                totalPeriods: trend.length,
                avgScoreChange,
                peakPeriod,
                lowestPeriod
            }
        };
    }
}

export default new ReportsService();
