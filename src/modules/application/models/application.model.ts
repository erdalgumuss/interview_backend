// src/modules/application/models/application.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidateProfile {
  name: string;
  surname: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  verificationCode?: string;
  verificationExpiresAt?: Date;
  kvkkConsent?: boolean;
}

export interface ICandidateEducation {
  school: string;
  degree: string;
  graduationYear: number;
}

export interface ICandidateExperience {
  company: string;
  position: string;
  duration: string;
  responsibilities: string;
}

export interface ICandidateSkills {
  technical: string[];
  personal: string[];
  languages: string[];
}

export interface ICandidateDocuments {
  resume?: string;
  certificates?: string[];
  socialMediaLinks?: string[];
}

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

export interface ISupportRequest {
  timestamp: Date;
  message: string;
}

export interface IGeneralAIAnalysis {
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
}

export interface IApplication extends Document {
  interviewId: mongoose.Types.ObjectId;
  candidate: ICandidateProfile;
  education: ICandidateEducation[];
  experience: ICandidateExperience[];
  skills: ICandidateSkills;
  documents: ICandidateDocuments;
  status: 'pending' | 'awaiting_video_responses' | 'in_progress' | 'awaiting_ai_analysis' | 'completed' | 'rejected' | 'accepted';
  personalityTestResults?: IPersonalityTestResults;
  aiAnalysisResults: mongoose.Types.ObjectId[];
  latestAIAnalysisId?: mongoose.Types.ObjectId;
  generalAIAnalysis?: IGeneralAIAnalysis;
  allowRetry: boolean;
  maxRetryAttempts?: number;
  retryCount?: number;
  supportRequests: ISupportRequest[];
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },

    candidate: {
      name: { type: String, required: true },
      surname: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      phoneVerified: { type: Boolean, default: false },
      verificationCode: { type: String, select: false },
      verificationExpiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
      kvkkConsent: { type: Boolean, default: false },
    },

    education: [
      {
        school: String,
        degree: String,
        graduationYear: Number,
      },
    ],

    experience: [
      {
        company: String,
        position: String,
        duration: String,
        responsibilities: String,
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

    status: {
      type: String,
      enum: [
        'pending',
        'awaiting_video_responses',
        'in_progress',
        'awaiting_ai_analysis',
        'completed',
        'rejected',
        'accepted',
      ],
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

    aiAnalysisResults: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' }],
    latestAIAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },

    generalAIAnalysis: {
      overallScore: Number,
      technicalSkillsScore: Number,
      communicationScore: Number,
      problemSolvingScore: Number,
      personalityMatchScore: Number,
      strengths: [String],
      areasForImprovement: [
        {
          area: String,
          recommendedAction: String,
        },
      ],
      recommendation: String,
    },

    allowRetry: { type: Boolean, default: false },
    maxRetryAttempts: { type: Number, default: 1 },
    retryCount: { type: Number, default: 0 },

    supportRequests: [
      {
        timestamp: { type: Date, required: true },
        message: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

ApplicationSchema.index({ interviewId: 1 });
ApplicationSchema.index({ 'candidate.email': 1 });

const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema);
export default ApplicationModel;
