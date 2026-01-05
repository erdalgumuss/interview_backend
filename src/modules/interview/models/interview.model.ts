// src/modules/interview/models/interview.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Her bir soru için kullanılacak interface
 */
export interface IInterviewQuestion {
    _id?: mongoose.Types.ObjectId; 
    questionText: string;
    expectedAnswer: string;
    explanation?: string;
    keywords: string[];
    order: number;
    duration: number;
    aiMetadata: {
        complexityLevel: 'low' | 'medium' | 'high' | 'intermediate' | 'advanced';
        requiredSkills: string[];
        keywordMatchScore?: number;
    };
}

/**
 * Pozisyon bilgileri - AI Server için gerekli
 */
export interface IPosition {
    title: string;
    department?: string;
    competencyWeights?: {
        technical?: number;
        communication?: number;
        problem_solving?: number;
    };
    description?: string;
}

export enum InterviewStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    PUBLISHED = 'published',
    DRAFT = 'draft',
    INACTIVE = 'inactive'
}

/**
 * Mülakat tipi enum
 */
export enum InterviewType {
    ASYNC_VIDEO = 'async-video',
    LIVE_VIDEO = 'live-video',
    AUDIO_ONLY = 'audio-only',
    TEXT_BASED = 'text-based'
}
  
/**
 * Asıl Interview dokümanı için kullanılacak interface
 */
export interface IInterview extends Document {
    title: string;
    description?: string;
    expirationDate: Date;
    createdBy: {
        userId: mongoose.Types.ObjectId;
    };
    status: InterviewStatus;
    
    // Mülakat tipi
    type?: InterviewType;
    
    // Pozisyon bilgileri
    position?: IPosition;
    
    personalityTestId?: mongoose.Types.ObjectId; // Ref to PersonalityTest
    stages: {
        personalityTest: boolean;
        questionnaire: boolean;
    };
    interviewLink: {
        link: string;
        expirationDate?: Date;
    };
    questions: IInterviewQuestion[];
    
    // ✅ EKLENDİ: AI Analiz Ayarları (Interface'de vardı, Schema'ya bağlanacak)
    aiAnalysisSettings: {
        useAutomaticScoring: boolean;
        gestureAnalysis: boolean;
        speechAnalysis: boolean;
        eyeContactAnalysis: boolean;
        tonalAnalysis: boolean;
        keywordMatchScore: number;
    };

    // ✅ EKLENDİ: Soft delete için gerekli alan (Repository kullanıyor)
    deletedAt?: Date | null;

    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * InterviewQuestion alt şeması
 */
const InterviewQuestionSchema = new Schema<IInterviewQuestion>(
    {
        questionText: { type: String, required: true },
        expectedAnswer: { type: String, required: true },
        explanation: { type: String },
        keywords: { type: [String], required: true },
        order: { type: Number, required: true },
        duration: { type: Number, required: true },
        aiMetadata: {
            complexityLevel: {
                type: String,
                enum: ['low', 'medium', 'high', 'intermediate', 'advanced'],
                required: true,
            },
            requiredSkills: { type: [String], required: true },
            keywordMatchScore: { type: Number, default: 0 },
        },
    },
    {
        _id: false, 
    }
);

/**
 * Position alt şeması
 */
const PositionSchema = new Schema<IPosition>(
    {
        title: { type: String, required: true },
        department: { type: String },
        competencyWeights: {
            technical: { type: Number, min: 0, max: 100 },
            communication: { type: Number, min: 0, max: 100 },
            problem_solving: { type: Number, min: 0, max: 100 },
        },
        description: { type: String },
    },
    { _id: false }
);

/**
 * ✅ TAŞINDI: AiAnalysisSettingsSchema (InterviewSchema içinde kullanabilmek için yukarı alındı)
 */
const AiAnalysisSettingsSchema = new Schema({
    useAutomaticScoring: { type: Boolean, default: true },
    gestureAnalysis: { type: Boolean, default: true },
    speechAnalysis: { type: Boolean, default: true },
    eyeContactAnalysis: { type: Boolean, default: false },
    tonalAnalysis: { type: Boolean, default: false },
    keywordMatchScore: { type: Number, default: 0 }, 
}, { _id: false });

/**
 * Asıl Interview şeması
 */
const InterviewSchema = new Schema<IInterview>(
    {
        title: { type: String, required: true },
        description: { type: String, required: false, default: '' }, 
        expirationDate: {  type: Date, required: true },
        createdBy: {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        },
        status: {
            type: String,
            enum: Object.values(InterviewStatus),
            default: InterviewStatus.DRAFT,
        },
        // Mülakat tipi
        type: {
            type: String,
            enum: Object.values(InterviewType),
            default: InterviewType.ASYNC_VIDEO,
        },
        // Pozisyon bilgileri
        position: PositionSchema,
        personalityTestId: {
            type: mongoose.Schema.Types.ObjectId,
            //ref: 'PersonalityTest',
        },
        stages: {
            personalityTest: { type: Boolean, default: false },
            questionnaire: { type: Boolean, default: true },
        },
        interviewLink: {
            link: { type: String },
            expirationDate: { type: Date },
        },
        questions: [InterviewQuestionSchema],

        // ✅ EKLENDİ: AI Analiz Ayarları Şemaya Bağlandı
        aiAnalysisSettings: {
            type: AiAnalysisSettingsSchema,
            default: () => ({}), // Boş obje olarak başlat
        },

        // ✅ EKLENDİ: Soft Delete Alanı
        deletedAt: { type: Date, default: null },
    },
    {
        timestamps: true 
    }
);

export default mongoose.model<IInterview>('Interview', InterviewSchema);