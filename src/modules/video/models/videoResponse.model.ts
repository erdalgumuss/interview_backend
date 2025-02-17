import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  IVideoResponse Interface
 * -----------------------------
 * Adayın video yanıtlarının tutulduğu yapı.
 */
export interface IVideoResponse extends Document {
    applicationId: mongoose.Types.ObjectId;
    questionId: mongoose.Types.ObjectId;
    videoUrl: string;
    duration: number;
    aiAnalysisId?: mongoose.Types.ObjectId;
    uploadedAt: Date;
    uploadedByCandidate: boolean;  // ✅ Videonun aday tarafından yüklenip yüklenmediğini belirtir
    status: 'pending' | 'processed'; // ✅ AI Analiz için işlenme durumu
}

/**
 * -----------------------------
 *  Video Yanıt Şeması
 * -----------------------------
 */
const VideoResponseSchema: Schema = new Schema(
    {
        applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true },
        videoUrl: { type: String, required: true },
        duration: { type: Number, required: true },
        aiAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis', required: false },
        uploadedAt: { type: Date, default: Date.now },
        uploadedByCandidate: { type: Boolean, default: true }, // ✅
        status: { type: String, enum: ['pending', 'processed'], default: 'pending' }, // ✅
    },
    {
        timestamps: true,
    }
);

const VideoResponseModel = mongoose.model<IVideoResponse>('VideoResponse', VideoResponseSchema);
export default VideoResponseModel;
