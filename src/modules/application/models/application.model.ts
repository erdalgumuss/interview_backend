import mongoose, { Schema, Document } from 'mongoose';

/**
 * ---------------------------
 *  ICandidateProfile Interface
 * ---------------------------
 */
export interface ICandidateProfile {
    name: string;
    surname: string;
    email: string;
    phone: string;
    phoneVerified: boolean;
    verificationCode?: string;
    verificationExpiresAt?: Date;
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
 */
export interface IApplicationResponse {
    questionId: mongoose.Types.ObjectId;
    textAnswer?: string; // AI analizden sonra oluşacak yazılı yanıt
}

/**
 * -----------------------------
 *  IPersonalityTestResults Interface
 * -----------------------------
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
 */
export interface ISupportRequest {
    timestamp: Date;
    message: string;
}

/**
 * -----------------------------
 *  IApplication Interface
 * -----------------------------
 */
export interface IApplication extends Document {
    interviewId: mongoose.Types.ObjectId;
    candidate: ICandidateProfile;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'accepted';
    personalityTestResults?: IPersonalityTestResults;
    responses: IApplicationResponse[];
    aiAnalysisResults: mongoose.Types.ObjectId[];
    latestAIAnalysisId?: mongoose.Types.ObjectId;
    generalAIAnalysis?: {
        overallScore?: number;
        technicalSkillsScore?: number;
        communicationScore?: number;
        problemSolvingScore?: number;
        personalityMatchScore?: number;
        strengths?: string[];
        areasForImprovement?: {
            area: string;
            recommendedAction: string;
        }[];
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
 *  Schema Tanımlama
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
                    responsibilities: { type: String },
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
            testId: { type: mongoose.Schema.Types.ObjectId },
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
        responses: [
            {
                questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
                textAnswer: { type: String },
            }
        ],
        aiAnalysisResults: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' }],
        latestAIAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
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
                    recommendedAction: { type: String },
                }
            ],
            recommendation: { type: String },
        },
        allowRetry: { type: Boolean, default: false },
        maxRetryAttempts: { type: Number, default: 1 },
        retryCount: { type: Number, default: 0 },
        supportRequests: [
            {
                timestamp: { type: Date, required: true },
                message: { type: String, required: true },
            }
        ]
    },
    { timestamps: true }
);

/**
 * -----------------------------
 *  Indexler
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
