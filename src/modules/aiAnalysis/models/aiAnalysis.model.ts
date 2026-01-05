import mongoose, { Schema, Document } from 'mongoose';
import { PipelineStatus } from '../types/aiServer.types';

/**
 * @deprecated Eski AI Server response tipi - geriye uyumluluk için korunuyor
 */
export interface IAIAnalysisResponse {
  transcriptionText: string;
  overallScore?: number;
  technicalSkillsScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  personalityMatchScore?: number;
  keywordMatches?: string[];
  strengths?: string[];
  improvementAreas?: {
    area: string;
    recommendation: string;
  }[];
  recommendation?: string;
}

/**
 * Yeni: Transkripsiyon detayları
 */
export interface ITranscriptionDetails {
  text: string;
  duration?: number;
  language?: string;
  confidence?: number;
}

/**
 * Yeni: Yüz analizi skorları
 */
export interface IFaceScores {
  engagement?: number;
  confidence?: number;
  eye_contact?: number;
  dominant_emotion?: string;
  emotions?: Record<string, number>;
  details?: {
    avgEngagement?: number;
    eyeContactPercentage?: number;
    facialMovementScore?: number;
  };
}

/**
 * Yeni: Ses analizi skorları
 */
export interface IVoiceScores {
  confidence?: number;
  energy?: number;
  speech_rate?: number;
  clarity?: number;
  pitch_variance?: number;
  emotion?: string;
}

/**
 * Yeni: Değerlendirme sonucu
 */
export interface IEvaluationResult {
  contentScore?: number;
  technicalAccuracy?: number;
  keywordMatch?: string[];
  communicationScore?: number;
  overallScore?: number;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
}

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
  createdAt: Date;
  
  // Eski alanlar (geriye uyumluluk)
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
  analyzedAt: Date;                          // AI analizin yapıldığı zaman

  // YENİ: AI Server pipeline bilgileri
  aiServerInterviewRecordId?: string;
  aiServerPipelineId?: string;
  aiServerJobId?: string;
  pipelineStatus?: PipelineStatus;

  // YENİ: Detaylı analiz sonuçları
  transcription?: ITranscriptionDetails;
  faceScores?: IFaceScores;
  voiceScores?: IVoiceScores;
  evaluationResult?: IEvaluationResult;
}

const AIAnalysisSchema: Schema<IAIAnalysis> = new Schema(
  {
    videoResponseId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoResponse', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true },

    // Eski alanlar (geriye uyumluluk) - transcriptionText artık zorunlu değil
    transcriptionText: { type: String, default: '' },

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

    // YENİ: AI Server pipeline bilgileri
    aiServerInterviewRecordId: { type: String },
    aiServerPipelineId: { type: String },
    aiServerJobId: { type: String },
    pipelineStatus: { 
      type: String, 
      enum: ['queued', 'in_progress', 'done', 'failed'],
      default: 'queued'
    },

    // YENİ: Detaylı transkripsiyon
    transcription: {
      text: { type: String },
      duration: { type: Number },
      language: { type: String },
      confidence: { type: Number },
    },

    // YENİ: Yüz analizi skorları
    faceScores: {
      engagement: { type: Number },
      confidence: { type: Number },
      eye_contact: { type: Number },
      dominant_emotion: { type: String },
      emotions: { type: Schema.Types.Mixed },
      details: {
        avgEngagement: { type: Number },
        eyeContactPercentage: { type: Number },
        facialMovementScore: { type: Number },
      },
    },

    // YENİ: Ses analizi skorları
    voiceScores: {
      confidence: { type: Number },
      energy: { type: Number },
      speech_rate: { type: Number },
      clarity: { type: Number },
      pitch_variance: { type: Number },
      emotion: { type: String },
    },

    // YENİ: Değerlendirme sonucu
    evaluationResult: {
      contentScore: { type: Number },
      technicalAccuracy: { type: Number },
      keywordMatch: { type: [String] },
      communicationScore: { type: Number },
      overallScore: { type: Number },
      feedback: { type: String },
      strengths: { type: [String] },
      improvements: { type: [String] },
    },
  },
  { timestamps: true } // createdAt ve updatedAt otomatik olacak
);

/**
 * Indexler (Performans için)
 */
AIAnalysisSchema.index({ applicationId: 1 });
AIAnalysisSchema.index({ videoResponseId: 1 });
AIAnalysisSchema.index({ questionId: 1 });
AIAnalysisSchema.index({ aiServerPipelineId: 1 }); // YENİ: Pipeline ID ile arama
AIAnalysisSchema.index({ pipelineStatus: 1 }); // YENİ: Status ile filtreleme

const AIAnalysisModel = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
export default AIAnalysisModel;
