import mongoose, { Schema, Document } from 'mongoose';

export interface IAIAnalysis extends Document {
  transcriptionText: string;
  overallScore: number;
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;
  keywordMatches: string[];
  strengths: string[];
  improvementAreas: { area: string; recommendation: string }[];
  recommendation: string;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  engagementScore: number;
confidenceScore: number;
faceEmotionLabel: string;
  voiceConfidenceScore: number;
  speechFluencyScore: number;
  voiceEmotionLabel: string;
  videoPath: string;
  audioPath: string;
  videoEmotionLabel: string;
  videoConfidenceScore: number;
  videoEngagementScore: number;
  
}

const AIAnalysisSchema = new Schema<IAIAnalysis>(
  {
    transcriptionText: { type: String, required: true },
    overallScore: { type: Number, required: true },
    technicalSkillsScore: { type: Number },
    communicationScore: { type: Number },
    problemSolvingScore: { type: Number },
    personalityMatchScore: { type: Number },
    keywordMatches: [{ type: String }],
    strengths: [{ type: String }],
    engagementScore: { type: Number },
    confidenceScore: { type: Number },
    faceEmotionLabel: { type: String },
    voiceConfidenceScore: { type: Number }, 
    speechFluencyScore: { type: Number }, 
    voiceEmotionLabel: { type: String },
    videoPath: { type: String },
    audioPath: { type: String },
    videoEmotionLabel: { type: String },
    videoConfidenceScore: { type: Number },
    videoEngagementScore: { type: Number },

    improvementAreas: [
      {
        area: { type: String },
        recommendation: { type: String },
      },
    ],
    recommendation: { type: String },
    analyzedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // createdAt ve updatedAt otomatik olacak
  }
);

export const AIAnalysisModel = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
