// src/modules/video/models/videoResponse.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoResponse extends Document {
  applicationId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  videoUrl: string;
  duration: number;
  status: 'pending' | 'processed';
  uploadedAt: Date;
  aiAnalysisId?: mongoose.Types.ObjectId;
}

const VideoResponseSchema: Schema<IVideoResponse> = new Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion',
      required: true,
    },
    videoUrl: { type: String, required: true },
    duration: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Performans için gerekli indexler
VideoResponseSchema.index({ applicationId: 1 });
VideoResponseSchema.index({ questionId: 1 });
VideoResponseSchema.index({ status: 1 });

const VideoResponseModel = mongoose.model<IVideoResponse>(
  'VideoResponse',
  VideoResponseSchema
);
export default VideoResponseModel;
