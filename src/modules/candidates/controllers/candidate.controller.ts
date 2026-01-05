// src/modules/candidates/controllers/candidate.controller.ts

import { Request, Response, NextFunction } from 'express';
import CandidateService from '../services/candidate.service';
import { ICandidateFilters, CandidateStatus } from '../types/candidate.types';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';

/**
 * Candidate Controller
 * 
 * Aday havuzu endpoint'leri için controller.
 */
class CandidateController {

    /**
     * Query parametrelerini parse et
     */
    private parseFilters(query: any): ICandidateFilters {
        const filters: ICandidateFilters = {};

        // Position/Interview IDs
        if (query.positionIds) {
            filters.positionIds = Array.isArray(query.positionIds) 
                ? query.positionIds 
                : query.positionIds.split(',').map((id: string) => id.trim());
        }
        if (query.interviewIds) {
            filters.interviewIds = Array.isArray(query.interviewIds)
                ? query.interviewIds
                : query.interviewIds.split(',').map((id: string) => id.trim());
        }

        // Mülakat sayısı
        if (query.minInterviewCount) filters.minInterviewCount = parseInt(query.minInterviewCount);
        if (query.maxInterviewCount) filters.maxInterviewCount = parseInt(query.maxInterviewCount);

        // Tarih filtreleri
        if (query.lastInterviewAfter) filters.lastInterviewAfter = new Date(query.lastInterviewAfter);
        if (query.lastInterviewBefore) filters.lastInterviewBefore = new Date(query.lastInterviewBefore);

        // Skor filtreleri
        if (query.minOverallScore) filters.minOverallScore = parseFloat(query.minOverallScore);
        if (query.maxOverallScore) filters.maxOverallScore = parseFloat(query.maxOverallScore);
        if (query.minTechnicalScore) filters.minTechnicalScore = parseFloat(query.minTechnicalScore);
        if (query.minCommunicationScore) filters.minCommunicationScore = parseFloat(query.minCommunicationScore);

        // Boolean ve enum filtreleri
        if (query.onlyFavorites === 'true') filters.onlyFavorites = true;
        if (query.status) {
            filters.status = Array.isArray(query.status)
                ? query.status
                : query.status.split(',').map((s: string) => s.trim());
        }

        // Arama
        if (query.search) filters.search = query.search;

        // Sıralama
        if (query.sortBy) filters.sortBy = query.sortBy;
        if (query.sortOrder) filters.sortOrder = query.sortOrder;

        // Sayfalama
        if (query.page) filters.page = parseInt(query.page);
        if (query.pageSize) filters.pageSize = parseInt(query.pageSize);
        if (query.limit) filters.limit = parseInt(query.limit);

        return filters;
    }

    // ================================
    // 1. ADAY LİSTELEME
    // ================================

    /**
     * GET /api/candidates
     * Aday havuzu listeleme
     */
    listCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = this.parseFilters(req.query);
            const result = await CandidateService.listCandidates(filters);

            res.status(200).json({
                success: true,
                data: result.candidates,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/candidates/positions
     * Filtreleme için mevcut pozisyon listesi
     */
    getPositions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const positions = await CandidateService.getPositions();

            res.status(200).json({
                success: true,
                data: positions
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 2. ADAY DETAY
    // ================================

    /**
     * GET /api/candidates/:candidateId
     */
    getCandidateDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const candidate = await CandidateService.getCandidateDetail(candidateId);

            if (!candidate) {
                return next(new AppError('Aday bulunamadı', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(200).json({
                success: true,
                data: candidate
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 3. MÜLAKAT GEÇMİŞİ
    // ================================

    /**
     * GET /api/candidates/:candidateId/interviews
     */
    getCandidateInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const interviews = await CandidateService.getCandidateInterviews(candidateId);

            res.status(200).json({
                success: true,
                data: interviews
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 4. SKOR TRENDİ
    // ================================

    /**
     * GET /api/candidates/:candidateId/score-trend
     */
    getScoreTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const trend = await CandidateService.getScoreTrend(candidateId);

            res.status(200).json({
                success: true,
                data: trend
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 5. FAVORİ İŞLEMLERİ
    // ================================

    /**
     * POST /api/candidates/:candidateId/favorite
     */
    addToFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return next(new AppError('Kullanıcı kimliği bulunamadı', ErrorCodes.UNAUTHORIZED, 401));
            }

            const success = await CandidateService.addToFavorites(candidateId, userId);

            if (!success) {
                return next(new AppError('Aday favorilere eklenemedi', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(200).json({
                success: true,
                message: 'Aday favorilere eklendi'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/candidates/:candidateId/favorite
     */
    removeFromFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const success = await CandidateService.removeFromFavorites(candidateId);

            if (!success) {
                return next(new AppError('Aday favorilerden çıkarılamadı', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(200).json({
                success: true,
                message: 'Aday favorilerden çıkarıldı'
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 6. NOT İŞLEMLERİ
    // ================================

    /**
     * GET /api/candidates/:candidateId/notes
     */
    getNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const notes = await CandidateService.getNotes(candidateId);

            res.status(200).json({
                success: true,
                data: notes
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/candidates/:candidateId/notes
     */
    addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const { content } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return next(new AppError('Kullanıcı kimliği bulunamadı', ErrorCodes.UNAUTHORIZED, 401));
            }

            if (!content || content.trim().length === 0) {
                return next(new AppError('Not içeriği gerekli', ErrorCodes.VALIDATION_ERROR, 400));
            }

            // TODO: Kullanıcı adını user service'den al
            const userName = 'HR User'; // Geçici

            const note = await CandidateService.addNote(candidateId, userId, userName, content);

            if (!note) {
                return next(new AppError('Not eklenemedi', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(201).json({
                success: true,
                data: note
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 7. STATUS GÜNCELLEMESİ
    // ================================

    /**
     * PATCH /api/candidates/:candidateId/status
     */
    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const { status } = req.body;

            const validStatuses: CandidateStatus[] = ['active', 'reviewed', 'shortlisted', 'archived', 'rejected'];
            if (!status || !validStatuses.includes(status)) {
                return next(new AppError('Geçersiz durum değeri', ErrorCodes.VALIDATION_ERROR, 400));
            }

            const success = await CandidateService.updateStatus(candidateId, status);

            if (!success) {
                return next(new AppError('Durum güncellenemedi', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(200).json({
                success: true,
                message: `Aday durumu "${status}" olarak güncellendi`
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 8. DUPLICATE DETECTION
    // ================================

    /**
     * GET /api/candidates/:candidateId/potential-duplicates
     */
    getPotentialDuplicates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const duplicates = await CandidateService.getPotentialDuplicates(candidateId);

            res.status(200).json({
                success: true,
                data: duplicates
            });
        } catch (error) {
            next(error);
        }
    };

    // ================================
    // 9. MERGE
    // ================================

    /**
     * POST /api/candidates/:candidateId/merge
     */
    mergeCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { candidateId } = req.params;
            const { targetCandidateId } = req.body;

            if (!targetCandidateId) {
                return next(new AppError('Hedef aday ID\'si gerekli', ErrorCodes.VALIDATION_ERROR, 400));
            }

            if (candidateId === targetCandidateId) {
                return next(new AppError('Bir aday kendisiyle birleştirilemez', ErrorCodes.VALIDATION_ERROR, 400));
            }

            const result = await CandidateService.mergeCandidates(candidateId, targetCandidateId);

            if (!result) {
                return next(new AppError('Adaylar birleştirilemedi', ErrorCodes.NOT_FOUND, 404));
            }

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new CandidateController();
