import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  candidateName?: string;
  candidateEmail?: string;
  interviewTitle: string;
  generalAIAnalysis?: {
    overallScore: number;
    strengths: string[];
    areasForImprovement: string[];
    recommendation: string;
    averageTimeEfficiency: number;
    completionRate: number;
  };
  latestAIAnalysisId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    candidateName: { type: String },
    candidateEmail: { type: String },
    interviewTitle: { type: String, required: true },
    generalAIAnalysis: {
      overallScore: { type: Number },
      strengths: [{ type: String }],
      areasForImprovement: [{ type: String }],
      recommendation: { type: String },
      averageTimeEfficiency: { type: Number },
      completionRate: { type: Number },
    },
    latestAIAnalysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis' },
  },
  {
    timestamps: true, // createdAt ve updatedAt otomatik
  }
);

export const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema);
