// src/modules/candidates/models/candidate.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Aday Durumu
 * Soft status - silme yok
 */
export type CandidateStatus = 'active' | 'reviewed' | 'shortlisted' | 'archived' | 'rejected';

/**
 * HR Notu
 */
export interface ICandidateNote {
    _id?: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    authorName: string;
    content: string;
    createdAt: Date;
}

/**
 * Aggregate Skor Özeti
 * Mevcut analizlerden okunur, yeniden hesaplanmaz
 */
export interface ICandidateScoreSummary {
    avgOverallScore?: number;
    avgTechnicalScore?: number;
    avgCommunicationScore?: number;
    avgProblemSolvingScore?: number;
    avgPersonalityScore?: number;
    lastScore?: number;
    lastScoreDate?: Date;
    totalInterviews: number;
    completedInterviews: number;
}

/**
 * Email Alias (merge sonrası)
 */
export interface IEmailAlias {
    email: string;
    mergedFrom?: mongoose.Types.ObjectId;
    mergedAt?: Date;
}

/**
 * Candidate Model
 * Email bazlı unique aday kaydı
 * 
 * 📋 MODÜL SÖZLEŞMESİ:
 * - Identity (primaryEmail, emailAliases) - SADECE Candidate yönetir
 * - Canonical Profile (name, surname, phone) - SADECE Candidate yönetir
 * - HR Domain (status, isFavorite, notes) - SADECE Candidate yönetir
 * - Aggregated Projections (scoreSummary) - SADECE Candidate yönetir
 * - Application/Interview referansları - Candidate'in applicationIds/interviewIds tek kaynak
 * 
 * ❌ YAPMAZ:
 * - OTP / verification
 * - Interview state yönetimi
 * - Video / response kaydı
 * - AI analiz üretimi
 * - Application lifecycle yönetimi
 */
export interface ICandidate extends Document {
    _id: mongoose.Types.ObjectId;
    
    // ===== IDENTITY (Single Source of Truth) =====
    primaryEmail: string;
    emailAliases: IEmailAlias[];
    
    // ===== CANONICAL PROFILE =====
    name: string;
    surname: string;
    phone?: string;
    
    // ===== HR DOMAIN =====
    status: CandidateStatus;
    isFavorite: boolean;
    favoritedBy?: mongoose.Types.ObjectId;
    favoritedAt?: Date;
    notes: ICandidateNote[];
    
    // ===== AGGREGATED PROJECTIONS =====
    scoreSummary: ICandidateScoreSummary;
    
    // ===== CROSS-INTERVIEW VIEW =====
    /** Application ID'leri - Candidate tek sahip */
    applicationIds: mongoose.Types.ObjectId[];
    /** Interview ID'leri (cache için) */
    interviewIds: mongoose.Types.ObjectId[];
    
    // ===== CACHE FIELDS (N+1 Optimization) =====
    /** Son mülakat tarihi (filtreleme için) */
    lastInterviewDate?: Date;
    firstInterviewDate?: Date;
    /** Son mülakat başlığı (N+1 optimizasyonu için cache) */
    lastInterviewTitle?: string;
    
    // ===== MERGE LIFECYCLE =====
    mergedInto?: mongoose.Types.ObjectId;
    mergedAt?: Date;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Candidate Note Schema
 */
const CandidateNoteSchema = new Schema<ICandidateNote>(
    {
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, required: true },
        content: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now }
    },
    { _id: true }
);

/**
 * Email Alias Schema
 */
const EmailAliasSchema = new Schema<IEmailAlias>(
    {
        email: { type: String, required: true, lowercase: true },
        mergedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
        mergedAt: { type: Date }
    },
    { _id: false }
);

/**
 * Score Summary Schema
 */
const ScoreSummarySchema = new Schema<ICandidateScoreSummary>(
    {
        avgOverallScore: { type: Number },
        avgTechnicalScore: { type: Number },
        avgCommunicationScore: { type: Number },
        avgProblemSolvingScore: { type: Number },
        avgPersonalityScore: { type: Number },
        lastScore: { type: Number },
        lastScoreDate: { type: Date },
        totalInterviews: { type: Number, default: 0 },
        completedInterviews: { type: Number, default: 0 }
    },
    { _id: false }
);

/**
 * Candidate Schema
 */
const CandidateSchema = new Schema<ICandidate>(
    {
        primaryEmail: { 
            type: String, 
            required: true, 
            unique: true, 
            lowercase: true,
            trim: true
        },
        emailAliases: [EmailAliasSchema],
        name: { type: String, required: true, trim: true },
        surname: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        
        status: { 
            type: String, 
            enum: ['active', 'reviewed', 'shortlisted', 'archived', 'rejected'],
            default: 'active'
        },
        
        isFavorite: { type: Boolean, default: false },
        favoritedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        favoritedAt: { type: Date },
        notes: [CandidateNoteSchema],
        
        scoreSummary: { type: ScoreSummarySchema, default: {} },
        
        applicationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
        interviewIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interview' }],
        
        lastInterviewDate: { type: Date },
        firstInterviewDate: { type: Date },
        lastInterviewTitle: { type: String }, // N+1 optimization cache
        
        mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
        mergedAt: { type: Date }
    },
    { timestamps: true }
);

// ===== İNDEKSLER (FAZ 5.2) =====

// Identity indexes
CandidateSchema.index({ primaryEmail: 1 }, { unique: true });
CandidateSchema.index({ 'emailAliases.email': 1 }, { unique: true, sparse: true }); // FAZ 5.2: unique + sparse

// HR domain indexes
CandidateSchema.index({ status: 1 });
CandidateSchema.index({ isFavorite: 1 });

// Aggregation & filtering indexes
CandidateSchema.index({ lastInterviewDate: -1 });
CandidateSchema.index({ 'scoreSummary.avgOverallScore': -1 });

// Relationship indexes
CandidateSchema.index({ interviewIds: 1 });
CandidateSchema.index({ applicationIds: 1 }); // FAZ 5.2: applicationIds index

// Merge tracking index
CandidateSchema.index({ mergedInto: 1 }, { sparse: true });

// Text search index
CandidateSchema.index({ name: 'text', surname: 'text', primaryEmail: 'text' });

const CandidateModel = mongoose.model<ICandidate>('Candidate', CandidateSchema);
export default CandidateModel;
