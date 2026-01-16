// src/modules/reports/routes/reports.routes.ts

import { Router } from 'express';
import ReportsController from '../controllers/reports.controller';
import { authenticate } from '../../../middlewares/auth';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

/**
 * Reports Routes
 * 
 * Tüm endpoint'ler:
 * - HR role required (authenticate + authorize)
 * - Read-only (sadece GET)
 * - Ortak filtre parametreleri destekler
 * - Cache-friendly headers döner
 * 
 * Ortak Query Parametreleri:
 * - positionIds: Pozisyon ID'leri (virgülle ayrılmış)
 * - interviewIds: Mülakat ID'leri (virgülle ayrılmış)
 * - startDate: Başlangıç tarihi (ISO format: 2024-01-01)
 * - endDate: Bitiş tarihi (ISO format: 2024-03-31)
 * - reviewerIds: HR reviewer ID'leri (virgülle ayrılmış)
 * - tags: Etiketler (strong,medium,weak)
 * - onlyFavorites: Sadece favoriler (true/false)
 * - status: Durum filtresi (pending,completed,accepted)
 */

/**
 * @route   GET /api/reports/summary
 * @desc    Özet KPI Şeridi - Genel metrikler
 * @access  Private (HR)
 * @cache   5 dakika
 * 
 * Response:
 * {
 *   totalInterviews, evaluatedInterviews, pendingInterviews,
 *   completedApplications, favoriteRatio, avgOverallScore,
 *   avgTechnicalScore, avgCommunicationScore, avgInterviewDurationSec
 * }
 */
router.get('/summary', authenticate, cacheMiddleware(300), ReportsController.getSummary);

/**
 * @route   GET /api/reports/position-distribution
 * @desc    Pozisyon Bazlı Aday Dağılımı
 * @access  Private (HR)
 * @cache   10 dakika
 * 
 * Response:
 * {
 *   positions: [{
 *     positionId, positionName, department,
 *     distribution: { highFit, mediumFit, lowFit },
 *     totalApplications
 *   }]
 * }
 */
router.get('/position-distribution', authenticate, cacheMiddleware(600), ReportsController.getPositionDistribution);

/**
 * @route   GET /api/reports/fit-distribution
 * @desc    Rol Yakınlığı & Yetkinlik Dağılımı
 * @access  Private (HR)
 * @cache   10 dakika
 * 
 * Response:
 * {
 *   roleFitBuckets: [{ range, count, percentage }],
 *   avgScores: { technical, communication, problemSolving, personality },
 *   skillScatter: [{ communication, technical, problemSolving }]
 * }
 */
router.get('/fit-distribution', authenticate, cacheMiddleware(600), ReportsController.getFitDistribution);

/**
 * @route   GET /api/reports/question-effectiveness
 * @desc    Soru Bazlı Ayırt Edicilik Raporu
 * @access  Private (HR)
 * @cache   15 dakika
 * 
 * Response:
 * {
 *   questions: [{
 *     questionId, questionText, interviewTitle,
 *     varianceScore, avgAnswerDurationSec, analysisCompletionRate,
 *     avgScore, responseCount
 *   }],
 *   totalQuestions
 * }
 */
router.get('/question-effectiveness', authenticate, cacheMiddleware(900), ReportsController.getQuestionEffectiveness);

/**
 * @route   GET /api/reports/ai-hr-alignment
 * @desc    AI – HR Uyum Analizi
 * @access  Private (HR)
 * @cache   10 dakika
 * 
 * Response:
 * {
 *   overlapRatio, aiOnlyHigh, hrOnlyFavorite, bothHigh,
 *   totalEvaluated, alignmentTrend: [{ period, overlapRatio }]
 * }
 */
router.get('/ai-hr-alignment', authenticate, cacheMiddleware(600), ReportsController.getAIHRAlignment);

/**
 * @route   GET /api/reports/time-trends
 * @desc    Zaman Bazlı Trendler
 * @access  Private (HR)
 * @cache   30 dakika
 * 
 * Additional Query Params:
 * - interval: daily | weekly | monthly (default: weekly)
 * 
 * Response:
 * {
 *   trend: [{
 *     period, avgOverallScore, favoriteRatio,
 *     applicationCount, completionRate
 *   }],
 *   interval,
 *   summary: { totalPeriods, avgScoreChange, peakPeriod, lowestPeriod }
 * }
 */
router.get('/time-trends', authenticate, cacheMiddleware(1800), ReportsController.getTimeTrends);

export default router;