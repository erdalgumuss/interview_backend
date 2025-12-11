// src/modules/interview/models/interview.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Her bir soru için kullanılacak interface
 */
export interface IInterviewQuestion {
    _id?: mongoose.Types.ObjectId; // Alt şemada _id:false yaptığımız için opsiyonel
    questionText: string;
    expectedAnswer: string;
    explanation?: string;
    keywords: string[];
    order: number;
    duration: number;
    aiMetadata: {
        complexityLevel: 'low' | 'medium' | 'high';
        requiredSkills: string[];
        keywordMatchScore?: number;
    };
}
export enum InterviewStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    PUBLISHED = 'published',
    DRAFT = 'draft',
    INACTIVE = 'inactive'
  }
  
/**
 * Asıl Interview dokümanı için kullanılacak interface
 * timestamps: true kullanıldığı için createdAt & updatedAt opsiyonel tutulabilir.
 */
export interface IInterview extends Document {
    title: string;
    description?: string;
    expirationDate: Date;
    createdBy: {
        userId: mongoose.Types.ObjectId;
    };
    status: InterviewStatus;
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
    createdAt?: Date;
    updatedAt?: Date;
    aiAnalysisSettings: {
        useAutomaticScoring: boolean;
        gestureAnalysis: boolean;
        speechAnalysis: boolean;
        eyeContactAnalysis: boolean;
        tonalAnalysis: boolean;
        keywordMatchScore: number; // Global ağırlık/ayar için
    };
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
                enum: ['low', 'medium', 'high'],
                required: true,
            },
            requiredSkills: { type: [String], required: true },
            keywordMatchScore: { type: Number, default: 0 },
        },
    },
    {
        _id: false, // Alt doküman olduğu için ayrı bir _id oluşturulmasını istemeyebilirsiniz.
    }
);

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
        personalityTestId: {
            type: mongoose.Schema.Types.ObjectId,
            //: 'PersonalityTest',
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
    },
    
    {
        timestamps: true // createdAt & updatedAt otomatik olarak eklenecek
    }
    
);
const AiAnalysisSettingsSchema = new Schema({
    useAutomaticScoring: { type: Boolean, default: true },
    gestureAnalysis: { type: Boolean, default: true },
    speechAnalysis: { type: Boolean, default: true },
    eyeContactAnalysis: { type: Boolean, default: false },
    tonalAnalysis: { type: Boolean, default: false },
    keywordMatchScore: { type: Number, default: 0 }, // 0: Disabled, 1: Enabled veya ağırlık
}, { _id: false });
export default mongoose.model<IInterview>('Interview', InterviewSchema);
