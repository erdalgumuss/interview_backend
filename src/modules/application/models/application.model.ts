// src/modules/application/models/application.model.ts

import mongoose, { Schema, Document } from 'mongoose';


export type ApplicationStatus = 
    'pending' | 
    'awaiting_video_responses' | 
    'in_progress' | 
    'awaiting_ai_analysis' | 
    'completed' | 
    'rejected' | 
    'accepted';

export interface IApplicationResponse { 
  questionId: mongoose.Types.ObjectId;
  videoUrl?: string; // S3/Cloudfront linki
  textAnswer?: string; // Transkripsiyon veya metin yanıtı
  duration?: number; // Video süresi
}

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
  _id: mongoose.Types.ObjectId;
  id: string;
  interviewId: mongoose.Types.ObjectId;
  
  // ✅ NEW: Foreign key to Candidate - Single Source of Truth
  candidateId?: mongoose.Types.ObjectId;
  
  /**
   * @deprecated Bu alan FAZ 6.2'de kaldırılacak.
   * Yeni kod candidateId üzerinden Candidate modülüne erişmeli.
   * Sadece geriye uyumluluk ve migration için korunuyor.
   */
  candidate: ICandidateProfile;
  
  /**
   * @deprecated Bu alanlar Candidate modülüne taşınacak.
   * Application sadece interview execution context'i tutar.
   */
  education: ICandidateEducation[];
  /**
   * @deprecated Bu alanlar Candidate modülüne taşınacak.
   */
  experience: ICandidateExperience[];
  /**
   * @deprecated Bu alanlar Candidate modülüne taşınacak.
   */
  skills: ICandidateSkills;
  /**
   * @deprecated Bu alanlar Candidate modülüne taşınacak.
   */
  documents: ICandidateDocuments;
  
  status: ApplicationStatus; 
  personalityTestResults?: IPersonalityTestResults;
  aiAnalysisResults: mongoose.Types.ObjectId[];
  latestAIAnalysisId?: mongoose.Types.ObjectId;
  
  /**
   * @deprecated FAZ 3.1'de kaldırılacak. AIAnalysis modülü source of truth.
   */
  generalAIAnalysis?: IGeneralAIAnalysis;
  
  allowRetry: boolean;
  maxRetryAttempts?: number;
  retryCount?: number;
  supportRequests: ISupportRequest[];
  createdAt: Date;
  updatedAt: Date;
  responses: IApplicationResponse[]; 

  
}

const ApplicationSchema = new Schema<IApplication>(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    
    // ✅ NEW: Foreign key to Candidate - Single Source of Truth
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },

    /**
     * @deprecated Bu alan FAZ 6.2'de kaldırılacak.
     * Yeni kod candidateId üzerinden Candidate modülüne erişmeli.
     */
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

    // @deprecated - Bu alanlar Candidate modülüne taşınacak (FAZ 6.2)
    education: [
      {
        school: String,
        degree: String,
        graduationYear: Number,
      },
    ],

    // @deprecated - Bu alanlar Candidate modülüne taşınacak (FAZ 6.2)
    experience: [
      {
        company: String,
        position: String,
        duration: String,
        responsibilities: String,
      },
    ],

    // @deprecated - Bu alanlar Candidate modülüne taşınacak (FAZ 6.2)
    skills: {
      technical: { type: [String], default: [] },
      personal: { type: [String], default: [] },
      languages: { type: [String], default: [] },
    },

    // @deprecated - Bu alanlar Candidate modülüne taşınacak (FAZ 6.2)
    documents: {
      resume: { type: String, default: '' },
      certificates: { type: [String], default: [] },
      socialMediaLinks: { type: [String], default: [] },
    },

    status: {
      type: String,
      // 3. Status enum'unu doğrudan listelemek yerine, tanımladığınız tipleri kullanabilirsiniz
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

    // @deprecated FAZ 3.1 - AIAnalysis modülü source of truth olacak
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
    responses: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        videoUrl: { type: String }, 
        textAnswer: { type: String },
        duration: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

ApplicationSchema.index({ interviewId: 1 });
ApplicationSchema.index({ candidateId: 1 }); // ✅ NEW: candidateId index
ApplicationSchema.index({ 'candidate.email': 1 }); // @deprecated - migration sonrası kaldırılacak

const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema);
export default ApplicationModel;
