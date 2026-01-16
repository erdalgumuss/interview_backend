// src/modules/application/models/application.model.ts

import mongoose, { Schema, Document } from 'mongoose';


/**
 * Başvuru Durumu
 * Her durum başvuru lifecycle'ının bir aşamasını temsil eder
 */
export type ApplicationStatus = 
    'pending' |                    // İlk başvuru oluşturuldu, OTP bekliyor
    'otp_verified' |               // OTP doğrulandı, form doldurma başlayabilir
    'awaiting_video_responses' |   // Kişisel bilgiler tamamlandı, video bekleniyor
    'in_progress' |                // Video upload devam ediyor
    'awaiting_ai_analysis' |       // Tüm videolar yüklendi, AI analiz bekliyor
    'completed' |                  // AI analiz tamamlandı, İK değerlendirmesi bekliyor
    'rejected' |                   // İK tarafından reddedildi (final state)
    'accepted' |                   // İK tarafından kabul edildi (final state)
    'archived';                    // İK tarafından arşive alındı

/**
 * Başvuru Adımları
 * Resume logic için hangi adımda olduğunu takip eder
 */
export type ApplicationStep = 
    'otp_verification' |
    'personal_info' | 
    'education' | 
    'experience' | 
    'skills' |
    'personality_test' | 
    'video_responses' |
    'completed';

/**
 * Video Upload Durumu
 */
export type VideoUploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

/**
 * Video Yanıt Interface (geliştirilmiş)
 */
export interface IApplicationResponse { 
  questionId: mongoose.Types.ObjectId;
  videoUrl?: string; // S3/Cloudfront linki
  textAnswer?: string; // Transkripsiyon veya metin yanıtı
  duration?: number; // Video süresi (saniye)
  
  // Video Upload Tracking
  uploadStatus: VideoUploadStatus;
  uploadedAt?: Date;
  uploadRetryCount: number; // Kaç kez retry yapıldı
  lastUploadAttempt?: Date;
  
  // S3 Metadata
  s3Metadata?: {
    bucket: string;
    key: string;
    size: number; // bytes
    contentType: string;
    etag?: string;
  };
  
  // Error Tracking
  uploadError?: string; // Son upload hatası
}

/**
 * Başvuru İlerleme Durumu
 * Resume logic için kullanılır
 */
export interface IApplicationProgress {
  currentStep: ApplicationStep;
  completedSteps: ApplicationStep[];
  lastAccessedAt: Date;
  isResuming: boolean; // Session devam mı yoksa yeni mi
  stepCompletionDates: Map<ApplicationStep, Date>; // Her adımın tamamlanma tarihi
}

/**
 * Aday Profil Bilgileri (Başvuruya Özel Snapshot)
 * Her başvuru kendi snapshot'ını tutar
 */
export interface ICandidateProfile {
  name: string;
  surname: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  
  // OTP Security
  verificationCode?: string;
  verificationExpiresAt?: Date;
  verificationAttempts: number; // Maksimum 3 deneme
  lastOtpSentAt?: Date; // Rate limiting için
  otpBlockedUntil?: Date; // Brute force koruması (15 dakika)
  
  // Compliance
  kvkkConsent?: boolean;
  kvkkConsentDate?: Date;
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
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
}

/**
 * İK Notu (Başvuruya Özel)
 * Candidate model'indeki notes pattern'inden uyarlandı
 */
export interface IHRNote {
  _id?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  content: string;
  createdAt: Date;
  isPrivate: boolean; // Diğer İK'lar görebilir mi?
}




export interface IApplication extends Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  interviewId: mongoose.Types.ObjectId;
  
  // ===== ADAY BİLGİLERİ (Snapshot) =====
  candidate: ICandidateProfile;
  education: ICandidateEducation[];
  experience: ICandidateExperience[];
  skills: ICandidateSkills;
  documents: ICandidateDocuments;
  
  // ===== BAŞVURU DURUMU =====
  status: ApplicationStatus;
  applicationProgress: IApplicationProgress; // Resume logic için
  
  // ===== TEST VE ANALİZ SONUÇLARI =====
  personalityTestResults?: IPersonalityTestResults;
  responses: IApplicationResponse[]; // Video yanıtları
  aiAnalysisResults: mongoose.Types.ObjectId[]; // Tüm AI analiz referansları
  latestAIAnalysisId?: mongoose.Types.ObjectId;
  
  // ===== RETRY MEKANİZMASI =====
  allowRetry: boolean;
  maxRetryAttempts: number;
  retryCount: number;
  
  // ===== İK DOMAIN =====
  hrNotes: IHRNote[]; // İK notları (başvuruya özel)
  hrRating?: number; // 1-5 yıldız manuel değerlendirme
  reviewedBy?: mongoose.Types.ObjectId; // İnceleyen İK kullanıcısı
  reviewedAt?: Date;
  
  // ===== FAVORİ SİSTEMİ =====
  favoritedBy: mongoose.Types.ObjectId[]; // Birden fazla İK favorilere ekleyebilir
  
  // ===== DESTEK VE İLETİŞİM =====
  supportRequests: ISupportRequest[];
  
  // ===== METADATA =====
  ipAddress?: string; // Başvuru yapılan IP
  userAgent?: string; // Browser bilgisi
  referrer?: string; // Nereden geldi
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date; // Başvuru tamamlanma tarihi
  
  // ===== SOFT DELETE =====
  deletedAt?: Date;
}

/**
 * HR Note Schema
 */
const HRNoteSchema = new Schema<IHRNote>(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false }
  },
  { _id: true }
);

/**
 * Application Progress Schema
 */
const ApplicationProgressSchema = new Schema<IApplicationProgress>(
  {
    currentStep: { 
      type: String, 
      enum: ['otp_verification', 'personal_info', 'education', 'experience', 'skills', 'personality_test', 'video_responses', 'completed'],
      default: 'otp_verification'
    },
    completedSteps: [{ 
      type: String, 
      enum: ['otp_verification', 'personal_info', 'education', 'experience', 'skills', 'personality_test', 'video_responses', 'completed']
    }],
    lastAccessedAt: { type: Date, default: Date.now },
    isResuming: { type: Boolean, default: false },
    stepCompletionDates: { type: Map, of: Date }
  },
  { _id: false }
);


const ApplicationSchema = new Schema<IApplication>(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },

    // ===== ADAY BİLGİLERİ =====
    candidate: {
      name: { type: String, required: true, trim: true },
      surname: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      phoneVerified: { type: Boolean, default: false },
      
      // OTP Security
      verificationCode: { type: String, select: false },
      verificationExpiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
      verificationAttempts: { type: Number, default: 0 },
      lastOtpSentAt: { type: Date },
      otpBlockedUntil: { type: Date },
      
      // Compliance
      kvkkConsent: { type: Boolean, default: false },
      kvkkConsentDate: { type: Date }
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

    // ===== BAŞVURU DURUMU =====
    status: {
      type: String,
      enum: [
        'pending',
        'otp_verified',
        'awaiting_video_responses',
        'in_progress',
        'awaiting_ai_analysis',
        'completed',
        'rejected',
        'accepted',
        'archived',
      ],
      default: 'pending',
    },
    
    applicationProgress: {
      type: ApplicationProgressSchema,
      default: () => ({
        currentStep: 'otp_verification',
        completedSteps: [],
        lastAccessedAt: new Date(),
        isResuming: false,
        stepCompletionDates: new Map()
      })
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

    // ===== AI ANALİZ SONUÇLARI =====
    aiAnalysisResults: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' }],
    latestAIAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },

 

    // ===== RETRY MEKANİZMASI =====
    allowRetry: { type: Boolean, default: false },
    maxRetryAttempts: { type: Number, default: 1 },
    retryCount: { type: Number, default: 0 },

    // ===== DESTEK VE İLETİŞİM =====
    supportRequests: [
      {
        timestamp: { type: Date, required: true },
        message: { type: String, required: true, maxlength: 1000 },
        resolved: { type: Boolean, default: false },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date }
      },
    ],
    // ===== VIDEO YANITLARI =====a
    responses: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        videoUrl: { type: String },
        textAnswer: { type: String },
        duration: { type: Number, min: 0 }, // saniye
        
        // Upload Tracking
        uploadStatus: { 
          type: String, 
          enum: ['pending', 'uploading', 'completed', 'failed'],
          default: 'pending'
        },
        uploadedAt: { type: Date },
        uploadRetryCount: { type: Number, default: 0 },
        lastUploadAttempt: { type: Date },
        
        // S3 Metadata
        s3Metadata: {
          bucket: String,
          key: String,
          size: Number,
          contentType: String,
          etag: String
        },
        
        // Error Tracking
        uploadError: { type: String, maxlength: 500 }
      },
    ],

    // ===== İK DOMAIN =====
    hrNotes: [HRNoteSchema],
    hrRating: { type: Number, min: 1, max: 5 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    
    favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // ===== METADATA =====
    ipAddress: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    completedAt: { type: Date },
    
    // ===== SOFT DELETE =====
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// ===== İNDEKSLER (Use Case Optimized) =====

// ✅ İK USE CASE: Duplicate başvuru kontrolü (UNIQUE)
ApplicationSchema.index(
  { 'candidate.email': 1, interviewId: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { deletedAt: null } // Soft delete için
  }
);

// ✅ İK USE CASE: Mülakat bazlı başvuru listeleme ve filtreleme
ApplicationSchema.index({ interviewId: 1, status: 1, createdAt: -1 });

// ✅ İK USE CASE: Status bazlı dashboard sorguları
ApplicationSchema.index({ status: 1, createdAt: -1 });

// ✅ İK USE CASE: AI skoru bazlı sıralama (en iyiler önce)
ApplicationSchema.index({ 'scoreSummary.overallScore': -1 });

// ✅ İK USE CASE: Favori başvurular
ApplicationSchema.index({ favoritedBy: 1, createdAt: -1 });

// ✅ İK USE CASE: İnceleme durumu
ApplicationSchema.index({ reviewedBy: 1, reviewedAt: -1 });

// ✅ İK USE CASE: Email bazlı arama (aynı adayın tüm başvuruları)
ApplicationSchema.index({ 'candidate.email': 1, createdAt: -1 });

// ✅ İK USE CASE: Telefon bazlı arama
ApplicationSchema.index({ 'candidate.phone': 1 });

// ✅ ADAY USE CASE: Email + OTP verification hızlı erişim
ApplicationSchema.index({ 'candidate.email': 1, 'candidate.phoneVerified': 1 });

// ✅ ADAY USE CASE: Resume logic - son erişilen başvuru
ApplicationSchema.index({ 'candidate.email': 1, 'applicationProgress.lastAccessedAt': -1 });

// ✅ SİSTEM: Soft delete için
ApplicationSchema.index({ deletedAt: 1 }, { sparse: true });

// ✅ SİSTEM: AI analiz kuyruğu için (completed olmayanlar)
ApplicationSchema.index({ 
  'responses.uploadStatus': 1,
  status: 1 
});

// ✅ RAPORLAMA: Tarih bazlı istatistikler
ApplicationSchema.index({ createdAt: 1 }); // Ascending index for time-series queries
ApplicationSchema.index({ completedAt: 1 }, { sparse: true });

// ✅ TEXT SEARCH: Aday ismi ile arama
ApplicationSchema.index({ 
  'candidate.name': 'text', 
  'candidate.surname': 'text', 
  'candidate.email': 'text' 
});

const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema);
export default ApplicationModel;
