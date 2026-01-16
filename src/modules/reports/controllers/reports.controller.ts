// src/modules/reports/controllers/reports.controller.ts

import { Request, Response, NextFunction } from 'express';
import ReportsService from '../services/reports.service';
import { IReportFilters } from '../types/reports.types';

/**
 * Reports Controller
 * 
 * Tüm report endpoint'leri için controller.
 * Ortak filtre parsing ve cache header'ları yönetir.
 */
class ReportsController {

    /**
     * Query parametrelerini parse ederek IReportFilters'a dönüştürür
     */
    private parseFilters(query: any): IReportFilters {
        const filters: IReportFilters = {};

        // Position/Interview IDs (virgülle ayrılmış)
        if (query.positionIds) {
            filters.positionIds = query.positionIds.split(',').map((id: string) => id.trim());
        }
        if (query.interviewIds) {
            filters.interviewIds = query.interviewIds.split(',').map((id: string) => id.trim());
        }

        // Tarih filtreleri
        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }

        // Reviewer IDs
        if (query.reviewerIds) {
            filters.reviewerIds = query.reviewerIds.split(',').map((id: string) => id.trim());
        }

        // Tags
        if (query.tags) {
            filters.tags = query.tags.split(',').map((tag: string) => tag.trim());
        }

        // Only favorites
        if (query.onlyFavorites === 'true') {
            filters.onlyFavorites = true;
        }

        // Status
        if (query.status) {
            filters.status = query.status.split(',').map((s: string) => s.trim());
        }

        return filters;
    }

    /**
     * Cache-friendly headers ekler
     */
    private setCacheHeaders(res: Response, maxAgeSec: number = 300): void {
        res.set({
            'Cache-Control': `public, max-age=${maxAgeSec}`,
            'ETag': `"${Date.now()}"`,
            'Last-Modified': new Date().toUTCString()
        });
    }

    /**
     * GET /reports/summary
     * Özet KPI Şeridi
     */
    getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const summary = await ReportsService.getSummary(filters);
            
            this.setCacheHeaders(res, 300); // 5 dakika cache
            
            res.status(200).json({
                success: true,
                data: summary,
                meta: {
                    filters,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /reports/position-distribution
     * Pozisyon Bazlı Aday Dağılımı
     */
    getPositionDistribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const distribution = await ReportsService.getPositionDistribution(filters);
            
            this.setCacheHeaders(res, 600); // 10 dakika cache
            
            res.status(200).json({
                success: true,
                data: distribution,
                meta: {
                    filters,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /reports/fit-distribution
     * Rol Yakınlığı & Yetkinlik Dağılımı
     */
    getFitDistribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const distribution = await ReportsService.getFitDistribution(filters);
            
            this.setCacheHeaders(res, 600); // 10 dakika cache
            
            res.status(200).json({
                success: true,
                data: distribution,
                meta: {
                    filters,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /reports/question-effectiveness
     * Soru Bazlı Ayırt Edicilik Raporu
     */
    getQuestionEffectiveness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const effectiveness = await ReportsService.getQuestionEffectiveness(filters);
            
            this.setCacheHeaders(res, 900); // 15 dakika cache
            
            res.status(200).json({
                success: true,
                data: effectiveness,
                meta: {
                    filters,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /reports/ai-hr-alignment
     * AI – HR Uyum Analizi
     */
    getAIHRAlignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const alignment = await ReportsService.getAIHRAlignment(filters);
            
            this.setCacheHeaders(res, 600); // 10 dakika cache
            
            res.status(200).json({
                success: true,
                data: alignment,
                meta: {
                    filters,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /reports/time-trends
     * Zaman Bazlı Trendler
     */
    getTimeTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'weekly';
            
            const trends = await ReportsService.getTimeTrends(filters, interval);
            
            this.setCacheHeaders(res, 1800); // 30 dakika cache
            
            res.status(200).json({
                success: true,
                data: trends,
                meta: {
                    filters,
                    interval,
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new ReportsController();