// src/modules/aiAnalysis/models/aiAnalysis.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  IAIAnalysis Interface
 * -----------------------------
 * Uygulama (Application) veya Mülakat (Interview) bazlı yapay zeka analiz sonuçlarını tutar.
 */
export interface IAIAnalysis extends Document {
    applicationId: mongoose.Types.ObjectId;    // Hangi başvuruya (Application) ait
    interviewId: mongoose.Types.ObjectId;     // Hangi mülakata (Interview) ait
    questionId?: mongoose.Types.ObjectId;      // Hangi soruya ait
    analysisType: 'question' | 'general';      // Soru bazlı mı, genel mi?
    scores: {
        overall?: number;
        technicalSkills?: number;
        communication?: number;
        problemSolving?: number;
        personalityFit?: number;
    };
    facialAnalysis?: {
        emotions?: Record<string, number>;       // { happy: 70, sad: 30 } gibi
        engagement?: number;
    };
    strengths?: string[];
    areasForImprovement?: string[];
    recommendation?: string;
    createdAt?: Date; // timestamps: true ile otomatik eklenecek, bu nedenle opsiyonel
    updatedAt?: Date; // timestamps: true ile otomatik eklenecek, bu nedenle opsiyonel
}

/**
 * -----------------------------
 *  Mongoose Schema Tanımlaması
 * -----------------------------
 */
const AIAnalysisSchema = new Schema<IAIAnalysis>(
    {
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            required: true,
        },
        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interview',
            required: true,
        },
        questionId: {
            type: mongoose.Schema.Types.ObjectId,

        },
        analysisType: {
            type: String,
            enum: ['question', 'general'],
            default: 'question',
        },
        scores: {
            overall: { type: Number },
            technicalSkills: { type: Number },
            communication: { type: Number },
            problemSolving: { type: Number },
            personalityFit: { type: Number },
        },
        facialAnalysis: {
            emotions: {
                type: Map,
                of: Number,
            },
            engagement: { type: Number },
        },
        strengths: [
            {
                type: String,
            },
        ],
        areasForImprovement: [
            {
                type: String,
            },
        ],
        recommendation: { type: String },
    },
    {
        timestamps: true, // createdAt & updatedAt otomatik eklenir
    }
);

/**
 * -----------------------------
 *  Indexler (Arama/Performans)
 * -----------------------------
 */
AIAnalysisSchema.index({ applicationId: 1 });
AIAnalysisSchema.index({ interviewId: 1 });

/**
 * -----------------------------
 *  Model Oluşturma
 * -----------------------------
 */
const AIAnalysisModel = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);

export default AIAnalysisModel;
