import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoResponse extends Document {
  videoUrl: string;
  applicationId: mongoose.Types.ObjectId;
  status: 'pending' | 'processed' | 'failed';
  aiAnalysisId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VideoResponseSchema = new Schema<IVideoResponse>(
  {
    videoUrl: { type: String, required: true },
    applicationId: { type: Schema.Types.ObjectId, required: true, ref: 'Application' },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    aiAnalysisId: { type: Schema.Types.ObjectId, ref: 'AIAnalysis' },
  },
  {
    timestamps: true, // createdAt ve updatedAt otomatik ekler
  }
);

export const VideoResponseModel = mongoose.model<IVideoResponse>('VideoResponse', VideoResponseSchema);
