import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  IAIAnalysis Interface
 * -----------------------------
 * Her bir video için AI analizi sonucu burada tutulur.
 */
export interface IAIAnalysis extends Document {
  videoResponseId: mongoose.Types.ObjectId; // Video ile bağlantı
  applicationId: mongoose.Types.ObjectId;   // Başvuru ile bağlantı
  questionId: mongoose.Types.ObjectId;      // Hangi soruya ait olduğu

  transcriptionText: string;                // Videodan AI tarafından çıkarılan metin
  overallScore?: number;                    // Genel puan
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;

  keywordMatches?: string[];                 // Anahtar kelime eşleşmeleri
  strengths?: string[];                      // Güçlü yönler
  improvementAreas?: {
    area: string;
    recommendation: string;
  }[];

  recommendation?: string;                   // Genel AI önerisi
  analyzedAt: Date;                           // AI analizin yapıldığı zaman
}

const AIAnalysisSchema: Schema<IAIAnalysis> = new Schema(
  {
    videoResponseId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoResponse', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true },

    transcriptionText: { type: String, required: true },

    overallScore: { type: Number },
    technicalSkillsScore: { type: Number },
    communicationScore: { type: Number },
    problemSolvingScore: { type: Number },
    personalityMatchScore: { type: Number },

    keywordMatches: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    improvementAreas: [
      {
        area: { type: String },
        recommendation: { type: String },
      }
    ],

    recommendation: { type: String },
    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // createdAt ve updatedAt otomatik olacak
);

/**
 * Indexler (Performans için)
 */
AIAnalysisSchema.index({ applicationId: 1 });
AIAnalysisSchema.index({ videoResponseId: 1 });
AIAnalysisSchema.index({ questionId: 1 });

const AIAnalysisModel = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
export default AIAnalysisModel;
