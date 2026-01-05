/**
 * AI Server API Type Definitions
 * Bu dosya, AI Server ile iletişim için gerekli tüm tip tanımlamalarını içerir.
 * CLIENT_API_GUIDE.md dokümanına göre hazırlanmıştır.
 */

// ==============================================
// AI SERVER REQUEST TYPES
// ==============================================

/**
 * Her istekte gönderilmesi gereken meta bilgiler
 */
export interface AIServerMeta {
  apiVersion: string;
  requestId: string;
  timestamp: string;
  callbackUrl?: string;
}

/**
 * Aday eğitim bilgisi
 */
export interface AIServerCandidateEducation {
  school: string;
  degree: string;
  graduationYear: number;
}

/**
 * Aday deneyim bilgisi
 */
export interface AIServerCandidateExperience {
  company: string;
  position: string;
  duration: string;
  description?: string;
}

/**
 * Aday beceri bilgileri
 */
export interface AIServerCandidateSkills {
  technical: string[];
  personal: string[];
  languages: string[];
}

/**
 * Aday kişilik testi sonuçları
 */
export interface AIServerPersonalityTest {
  MBTI?: string;
  Big5?: {
    O: number; // Openness
    C: number; // Conscientiousness
    E: number; // Extraversion
    A: number; // Agreeableness
    N: number; // Neuroticism
  };
}

/**
 * Aday bilgileri
 */
export interface AIServerCandidate {
  name: string;
  surname: string;
  email: string;
  education?: AIServerCandidateEducation[];
  experience?: AIServerCandidateExperience[];
  skills?: AIServerCandidateSkills;
  personalityTest?: AIServerPersonalityTest;
  cvUrl?: string;
}

/**
 * Başvuru bilgileri
 */
export interface AIServerApplication {
  id: string;
  candidate: AIServerCandidate;
}

/**
 * Soru için video bilgisi
 */
export interface AIServerQuestionVideo {
  videoResponseId: string;
  url: string;
}

/**
 * Soru AI metadata bilgisi
 */
export interface AIServerQuestionAIMetadata {
  complexityLevel: 'low' | 'medium' | 'high' | 'intermediate' | 'advanced';
  requiredSkills: string[];
}

/**
 * Mülakat sorusu
 */
export interface AIServerQuestion {
  id: string;
  order: number;
  duration: number;
  questionText: string;
  expectedAnswer?: string;
  keywords?: string[];
  aiMetadata?: AIServerQuestionAIMetadata;
  video: AIServerQuestionVideo;
}

/**
 * Pozisyon bilgileri
 */
export interface AIServerPosition {
  id: string;
  title: string;
  department?: string;
  competencyWeights?: {
    technical?: number;
    communication?: number;
    problem_solving?: number;
  };
  description?: string;
}

/**
 * Mülakat bilgileri
 */
export interface AIServerInterview {
  id: string;
  title: string;
  type?: string;
  position?: AIServerPosition;
  questions: AIServerQuestion[];
}

/**
 * POST /api/interview-record için istek payload'ı
 */
export interface AIServerInterviewRecordRequest {
  meta: AIServerMeta;
  application: AIServerApplication;
  interview: AIServerInterview;
}

// ==============================================
// AI SERVER RESPONSE TYPES
// ==============================================

/**
 * Pipeline bilgisi
 */
export interface AIServerPipelineInfo {
  questionId: string;
  pipelineId: string;
}

/**
 * POST /api/interview-record response
 */
export interface AIServerInterviewRecordResponse {
  ok: boolean;
  interviewRecordId?: string;
  pipelines?: AIServerPipelineInfo[];
  error?: string;
}

// ==============================================
// AI SERVER JOB RESULT TYPES
// ==============================================

/**
 * Transkripsiyon sonucu
 */
export interface AIServerTranscription {
  text: string;
  duration?: number;
  language?: string;
  confidence?: number;
}

/**
 * Yüz analizi skorları
 */
export interface AIServerFaceScores {
  engagement?: number;
  confidence?: number;
  eye_contact?: number;
  dominant_emotion?: string;
  emotions?: {
    happy?: number;
    neutral?: number;
    sad?: number;
    angry?: number;
    surprise?: number;
  };
  details?: {
    avgEngagement?: number;
    eyeContactPercentage?: number;
    facialMovementScore?: number;
  };
}

/**
 * Ses analizi skorları
 */
export interface AIServerVoiceScores {
  confidence?: number;
  energy?: number;
  speech_rate?: number;
  clarity?: number;
  pitch_variance?: number;
  emotion?: string;
}

/**
 * Değerlendirme sonucu
 */
export interface AIServerEvaluationResult {
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
 * Job sonucu - Pipeline işlem sonucu
 */
export interface AIServerJobResult {
  _id: string;
  videoResponseId: string;
  jobId: string;
  pipelineStatus: 'queued' | 'in_progress' | 'done' | 'failed';
  transcription?: AIServerTranscription;
  faceScores?: AIServerFaceScores;
  voiceScores?: AIServerVoiceScores;
  evaluationResult?: AIServerEvaluationResult;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GET /api/job-result/:videoResponseId response
 */
export interface AIServerJobResultResponse {
  status: 'success' | 'not_found' | 'error';
  result?: AIServerJobResult;
  message?: string;
}

// ==============================================
// INTERNAL TYPES (Backend internal use)
// ==============================================

/**
 * Analiz başlatma job'ı için data tipi
 */
export interface IStartAnalysisJobData {
  applicationId: string;
}

/**
 * Sonuç kontrol job'ı için data tipi
 */
export interface ICheckResultJobData {
  videoResponseId: string;
  pipelineId: string;
  applicationId: string;
  retryCount?: number;
}

/**
 * Pipeline durumu enum
 */
export type PipelineStatus = 'queued' | 'in_progress' | 'done' | 'failed';
