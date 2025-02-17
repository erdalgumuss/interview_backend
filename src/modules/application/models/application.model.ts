// src/modules/application/models/application.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * ---------------------------
 *  ICandidateProfile Interface
 * ---------------------------
 * Adayın kişisel bilgileri, eğitim, deneyim ve becerileri gibi alanları tutar.
 */
export interface ICandidateProfile {
    name: string;
    surname: string;
    email: string;
    phone: string;
    phoneVerified: boolean;
    verificationCode?: string;
    kvkkConsent?: boolean;
    education?: {
        school: string;
        degree: string;
        graduationYear: number;
    }[];
    experience?: {
        company: string;
        position: string;
        duration: string;
        responsibilities: string;
    }[];
    skills?: {
        technical: string[];
        personal: string[];
        languages: string[];
    };
    documents?: {
        resume?: string;
        certificates?: string[];
        socialMediaLinks?: string[];
    };
}

/**
 * -----------------------------
 *  IApplicationResponse Interface
 * -----------------------------
 * Adayın bir soruya (video metni, text, vb.) verdiği yanıta dair bilgileri tutar.
 */
export interface IApplicationResponse {
    questionId: mongoose.Types.ObjectId;
    videoUrl?: string;
    textAnswer?: string;
    aiAnalysisId?: mongoose.Types.ObjectId; // Bağlı bir AIAnalysis kaydına referans
    facialAnalysis?: {
        emotions?: Record<string, number>;
        engagement?: number;
    };
}

/**
 * -----------------------------
 *  IPersonalityTestResults Interface
 * -----------------------------
 * Adayın tamamladığı (veya başlattığı) kişilik testine ait sonuçları tutar.
 */
export interface IPersonalityTestResults {
    testId: mongoose.Types.ObjectId;
    completed: boolean;
    scores?: {
        openness?: number;
        conscientiousness?: number;
        extraversion?: number;
        agreeableness?: number;
        neuroticism?: number;
    };
    personalityFit?: number;
}

/**
 * -----------------------------
 *  ISupportRequest Interface
 * -----------------------------
 * Adayın destek (support) isteği gönderdiği durumları tutar.
 */
export interface ISupportRequest {
    timestamp: Date;
    message: string;
}

/**
 * -----------------------------
 *  IApplication Interface
 * -----------------------------
 * Adayın, belirli bir mülakata yaptığı başvuru dokümanına ait arayüz.
 */
export interface IApplication extends Document {
    _id: mongoose.Types.ObjectId;
    interviewId: mongoose.Types.ObjectId;  // Interview modeline referans
    candidate: ICandidateProfile;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'accepted';
    personalityTestResults?: IPersonalityTestResults;
    responses: IApplicationResponse[];
    aiAnalysisResults: mongoose.Types.ObjectId[]; // Birden fazla AIAnalysis kaydı
    latestAIAnalysisId?: mongoose.Types.ObjectId;
    generalAIAnalysis?: {
        overallScore?: number;
        technicalSkillsScore?: number;
        communicationScore?: number;
        problemSolvingScore?: number;
        personalityMatchScore?: number;
        strengths?: string[];
        areasForImprovement?: string[];
        recommendation?: string;
    };
    allowRetry: boolean;
    maxRetryAttempts?: number;
    retryCount?: number;
    supportRequests: ISupportRequest[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * -----------------------------
 *  Mongoose Schema Tanımlaması
 * -----------------------------
 */
const ApplicationSchema: Schema<IApplication> = new Schema(
    {
        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interview',
            required: true,
        },
        candidate: {
            name: { type: String, required: true },
            surname: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            phoneVerified: { type: Boolean, default: false },
            verificationCode: { type: String, select: false },
            verificationExpiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }, 
            kvkkConsent: { type: Boolean, default: false },
            education: [
                {
                    school: { type: String },
                    degree: { type: String },
                    graduationYear: { type: Number },
                },
            ],
            experience: [
                {
                    company: { type: String },
                    position: { type: String },
                    duration: { type: String },
                    responsibilities: { type: String, required: false }, // ✅ Opsiyonel hale getirildi
                },
            ],
            skills: {
                technical: { type: [String], default: [] },
                personal: { type: [String], default: [] },
                languages: { type: [String], default: [] },
            },
            documents: {
                resume: { type: String, default: '' },
                certificates: { type: [String], default: [] },
                socialMediaLinks: { type: [String], default: [] },
            },
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'rejected', 'accepted'],
            default: 'pending',
        },
        personalityTestResults: {
            testId: { type: mongoose.Schema.Types.ObjectId, /*ref: 'PersonalityTest'*/ },
            completed: { type: Boolean, default: false },
            scores: {
                openness: { type: Number, default: 0 },
                conscientiousness: { type: Number, default: 0 },
                extraversion: { type: Number, default: 0 },
                agreeableness: { type: Number, default: 0 },
                neuroticism: { type: Number, default: 0 },
            },
            personalityFit: { type: Number, default: 0 },
        },
        latestAIAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
        allowRetry: { type: Boolean, default: false },
        maxRetryAttempts: { type: Number, default: 1 },
        retryCount: { type: Number, default: 0 },
        generalAIAnalysis: {
            overallScore: { type: Number },
            technicalSkillsScore: { type: Number },
            communicationScore: { type: Number },
            problemSolvingScore: { type: Number },
            personalityMatchScore: { type: Number },
            strengths: [{ type: String }],
            areasForImprovement: [
                {
                    area: { type: String },
                    recommendedAction: { type: String }
                }
            ],
            recommendation: { type: String },
        }
    },
    { timestamps: true }
);


/**
 * -----------------------------
 *  Indexler (Arama/Performans)
 * -----------------------------
 */
ApplicationSchema.index({ interviewId: 1 });
ApplicationSchema.index({ 'candidate.email': 1 });

/**
 * -----------------------------
 *  Model Oluşturma
 * -----------------------------
 */
const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema);

export default ApplicationModel;
