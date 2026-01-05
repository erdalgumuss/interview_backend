// src/modules/candidates/types/candidate.types.ts

import mongoose from 'mongoose';
import { CandidateStatus, ICandidateNote, ICandidateScoreSummary } from '../models/candidate.model';

// Re-export for convenience
export { CandidateStatus } from '../models/candidate.model';

/**
 * Candidate Listeleme Filtreleri
 * GET /api/candidates query parametreleri
 */
export interface ICandidateFilters {
    // Pozisyon filtresi
    positionIds?: string[];
    interviewIds?: string[];
    
    // Mülakat sayısı filtresi
    minInterviewCount?: number;
    maxInterviewCount?: number;
    
    // Tarih filtreleri
    lastInterviewAfter?: Date;
    lastInterviewBefore?: Date;
    
    // Skor filtreleri
    minOverallScore?: number;
    maxOverallScore?: number;
    minTechnicalScore?: number;
    minCommunicationScore?: number;
    
    // Durum filtreleri
    onlyFavorites?: boolean;
    status?: CandidateStatus[];
    
    // Arama
    search?: string;
    
    // Sıralama
    sortBy?: 'lastInterview' | 'score' | 'createdAt' | 'name';
    sortOrder?: 'asc' | 'desc';
    
    // Sayfalama
    page?: number;
    pageSize?: number;
    limit?: number;
}

/**
 * Candidate Liste Item Response
 * Liste sayfasında gösterilecek özet bilgi
 */
export interface ICandidateListItem {
    _id: string;
    name: string;
    surname: string;
    fullName: string;
    primaryEmail: string;
    phone?: string;
    status: CandidateStatus;
    isFavorite: boolean;
    scoreSummary: {
        avgOverallScore?: number;
        avgTechnicalScore?: number;
        totalInterviews: number;
        completedInterviews: number;
    };
    lastInterviewDate?: Date;
    lastInterviewTitle?: string;
}

/**
 * Candidate Liste Response (paginated)
 */
export interface ICandidateListResponse {
    candidates: ICandidateListItem[];
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
    };
}

/**
 * Candidate Detay Response
 * GET /api/candidates/:id
 */
export interface ICandidateDetailResponse {
    _id: string;
    name: string;
    surname: string;
    fullName: string;
    primaryEmail: string;
    emailAliases: string[];
    phone?: string;
    status: CandidateStatus;
    isFavorite: boolean;
    favoritedAt?: Date;
    scoreSummary: ICandidateScoreSummary;
    lastInterviewDate?: Date;
    firstInterviewDate?: Date;
    notesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Candidate Interview History Item
 * GET /api/candidates/:id/interviews
 */
export interface ICandidateInterviewItem {
    applicationId: string;
    interviewId: string;
    interviewTitle: string;
    positionName?: string;
    department?: string;
    status: string;
    appliedAt: Date;
    completedAt?: Date;
    scores?: {
        overallScore?: number;
        technicalScore?: number;
        communicationScore?: number;
    };
}

/**
 * Score Trend Item
 * GET /api/candidates/:id/score-trend
 */
export interface IScoreTrendItem {
    date: Date;
    interviewId: string;
    interviewTitle: string;
    overallScore?: number;
    technicalScore?: number;
    communicationScore?: number;
}

/**
 * Score Trend Response
 */
export interface IScoreTrendResponse {
    trend: IScoreTrendItem[];
    summary: {
        firstScore?: number;
        lastScore?: number;
        avgScore?: number;
        scoreChange?: number;
        trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    };
}

/**
 * Potential Duplicate Response
 * GET /api/candidates/:id/potential-duplicates
 */
export interface IPotentialDuplicate {
    candidateId: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
    matchReason: 'email_similar' | 'phone_match' | 'name_match';
    matchScore: number; // 0-100
}

/**
 * Merge Request
 * POST /api/candidates/:id/merge
 */
export interface IMergeRequest {
    targetCandidateId: string;
}

/**
 * Merge Response
 */
export interface IMergeResponse {
    success: boolean;
    mergedCandidate: {
        _id: string;
        name: string;
        surname: string;
        primaryEmail: string;
        totalInterviews: number;
    };
    archivedCandidateId: string;
    interviewsMerged: number;
}

/**
 * Status Update Request
 * PATCH /api/candidates/:id/status
 */
export interface IStatusUpdateRequest {
    status: CandidateStatus;
    reason?: string;
}

/**
 * Note Create Request
 * POST /api/candidates/:id/notes
 */
export interface INoteCreateRequest {
    content: string;
}

/**
 * Note Response
 */
export interface INoteResponse {
    _id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Date;
}
