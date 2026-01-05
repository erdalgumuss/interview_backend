import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import VideoResponseModel, { IVideoResponse } from '../../video/models/videoResponse.model';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import AIAnalysisModel, { IAIAnalysisResponse, IAIAnalysis } from '../models/aiAnalysis.model';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import {
  AIServerInterviewRecordRequest,
  AIServerInterviewRecordResponse,
  AIServerJobResultResponse,
  AIServerQuestion,
  AIServerJobResult,
} from '../types/aiServer.types';

export class AIAnalysisService {
  private aiServerUrl: string;
  
  constructor() {
    this.aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:3000';
  }

  // ==============================================
  // YENİ API METOTLARI
  // ==============================================

  /**
   * YENİ: Tüm mülakat için batch analiz başlatır
   * Bu metot, bir başvurunun tüm video yanıtlarını tek seferde AI Server'a gönderir.
   */
  public async startInterviewAnalysis(applicationId: string): Promise<{
    interviewRecordId: string;
    pipelines: { questionId: string; pipelineId: string }[];
  }> {
    // 1) Application bilgilerini getir
    const application = await ApplicationModel.findById(applicationId);
    
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) Interview bilgilerini getir
    const interview = await InterviewModel.findById(application.interviewId);
    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 3) Video yanıtlarını getir
    const videoResponses = await VideoResponseModel.find({ applicationId: application._id });
    if (!videoResponses.length) {
      throw new AppError('No video responses found', ErrorCodes.NOT_FOUND, 404);
    }

    // 4) Payload oluştur
    const payload = this.buildInterviewRecordPayload(application, interview, videoResponses);

    // 5) AI Server'a istek at
    const response = await this.sendInterviewRecordRequest(payload);

    // 6) Her pipeline için AIAnalysis kaydı oluştur
    for (const pipeline of response.pipelines || []) {
      const videoResponse = videoResponses.find(
        v => v.questionId.toString() === pipeline.questionId
      );
      
      if (videoResponse) {
        await AIAnalysisModel.create({
          videoResponseId: videoResponse._id,
          applicationId: application._id,
          questionId: videoResponse.questionId,
          aiServerInterviewRecordId: response.interviewRecordId,
          aiServerPipelineId: pipeline.pipelineId,
          pipelineStatus: 'queued',
          transcriptionText: '', // Henüz yok
        });
      }
    }

    console.log(`✅ [AI Analysis] Interview analysis started. InterviewRecordId: ${response.interviewRecordId}`);

    return {
      interviewRecordId: response.interviewRecordId!,
      pipelines: response.pipelines || [],
    };
  }

  /**
   * YENİ: Polling ile sonuç kontrolü
   */
  public async checkAnalysisResult(videoResponseId: string): Promise<AIServerJobResultResponse> {
    const url = `${this.aiServerUrl}/api/job-result/${videoResponseId}`;
    
    try {
      const { data } = await axios.get<AIServerJobResultResponse>(url, { timeout: 10000 });
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { status: 'not_found', message: 'Sonuç henüz hazır değil' };
      }
      console.error('AI Server check result error:', error.message);
      throw new AppError('AI Server connection error', ErrorCodes.SERVER_ERROR, 503);
    }
  }

  /**
   * YENİ: Analiz sonucu geldiğinde kaydet
   */
  public async saveAnalysisResult(videoResponseId: string, result: AIServerJobResult): Promise<IAIAnalysis> {
    // Pipeline ID ile analiz kaydını bul
    const analysis = await AIAnalysisModel.findOne({ 
      videoResponseId: videoResponseId 
    });

    if (!analysis) {
      throw new AppError('Analysis record not found', ErrorCodes.NOT_FOUND, 404);
    }

    // Sonuçları güncelle
    analysis.pipelineStatus = result.pipelineStatus;
    analysis.aiServerJobId = result.jobId;
    
    // Transkripsiyon
    if (result.transcription) {
      analysis.transcriptionText = result.transcription.text || '';
      analysis.transcription = {
        text: result.transcription.text,
        duration: result.transcription.duration,
        language: result.transcription.language,
        confidence: result.transcription.confidence,
      };
    }
    
    // Yüz analizi
    if (result.faceScores) {
      analysis.faceScores = result.faceScores;
    }
    
    // Ses analizi
    if (result.voiceScores) {
      analysis.voiceScores = result.voiceScores;
    }
    
    // Değerlendirme sonucu
    if (result.evaluationResult) {
      analysis.evaluationResult = result.evaluationResult;
      
      // Eski alanları da güncelle (geriye uyumluluk)
      analysis.overallScore = result.evaluationResult.overallScore;
      analysis.communicationScore = result.evaluationResult.communicationScore;
      analysis.keywordMatches = result.evaluationResult.keywordMatch;
      analysis.strengths = result.evaluationResult.strengths;
      
      // improvementAreas dönüşümü
      if (result.evaluationResult.improvements) {
        analysis.improvementAreas = result.evaluationResult.improvements.map(imp => ({
          area: imp,
          recommendation: result.evaluationResult?.feedback || '',
        }));
      }
      
      analysis.recommendation = result.evaluationResult.feedback;
    }
    
    analysis.analyzedAt = new Date();
    await analysis.save();

    // Video durumunu güncelle
    await VideoResponseModel.updateOne(
      { _id: analysis.videoResponseId },
      { status: 'processed', aiAnalysisId: analysis._id }
    );

    // Başvuru modelinde transkripsiyon güncelle
    if (result.transcription?.text) {
      await ApplicationModel.updateOne(
        {
          _id: analysis.applicationId.toString(),
          'responses.questionId': analysis.questionId,
        },
        {
          $set: {
            'responses.$.textAnswer': result.transcription.text,
          },
        }
      );
    }

    console.log(`✅ [AI Analysis] Result saved for videoResponseId: ${videoResponseId}`);

    // Tüm analizler tamamlandı mı kontrol et
    await this.checkAndCalculateGeneralAnalysis(analysis.applicationId.toString());

    return analysis;
  }

  /**
   * YENİ: Tüm analizler tamamlandıysa genel analizi hesapla
   */
  private async checkAndCalculateGeneralAnalysis(applicationId: string): Promise<void> {
    const allAnalyses = await AIAnalysisModel.find({ applicationId });
    const pendingAnalyses = allAnalyses.filter(a => a.pipelineStatus !== 'done');
    
    if (pendingAnalyses.length === 0 && allAnalyses.length > 0) {
      console.log(`✅ [AI Analysis] All analyses completed for application: ${applicationId}. Calculating general analysis...`);
      await this.calculateGeneralAIAnalysis(applicationId);
    }
  }

  /**
   * HELPER: Interview Record payload oluştur
   */
  private buildInterviewRecordPayload(
    application: any,
    interview: any,
    videoResponses: IVideoResponse[]
  ): AIServerInterviewRecordRequest {
    
    // Questions dizisi oluştur
    const questions: AIServerQuestion[] = interview.questions.map((q: any) => {
      const videoResponse = videoResponses.find(
        v => v.questionId.toString() === q._id?.toString()
      );
      
      return {
        id: q._id?.toString() || '',
        order: q.order,
        duration: q.duration,
        questionText: q.questionText,
        expectedAnswer: q.expectedAnswer,
        keywords: q.keywords,
        aiMetadata: {
          complexityLevel: q.aiMetadata?.complexityLevel || 'medium',
          requiredSkills: q.aiMetadata?.requiredSkills || [],
        },
        video: {
          videoResponseId: videoResponse?._id?.toString() || '',
          url: videoResponse?.videoUrl || '',
        },
      };
    }).filter((q: AIServerQuestion) => q.video.url); // Sadece video yüklenmiş soruları dahil et

    return {
      meta: {
        apiVersion: '1.0.0',
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
      application: {
        id: application._id.toString(),
        candidate: {
          name: application.candidate.name,
          surname: application.candidate.surname,
          email: application.candidate.email,
          education: application.education?.map((e: any) => ({
            school: e.school,
            degree: e.degree,
            graduationYear: e.graduationYear,
          })),
          experience: application.experience?.map((e: any) => ({
            company: e.company,
            position: e.position,
            duration: e.duration,
            description: e.responsibilities,
          })),
          skills: {
            technical: application.skills?.technical || [],
            personal: application.skills?.personal || [],
            languages: application.skills?.languages || [],
          },
          personalityTest: application.personalityTestResults?.scores ? {
            Big5: {
              O: application.personalityTestResults.scores.openness || 0,
              C: application.personalityTestResults.scores.conscientiousness || 0,
              E: application.personalityTestResults.scores.extraversion || 0,
              A: application.personalityTestResults.scores.agreeableness || 0,
              N: application.personalityTestResults.scores.neuroticism || 0,
            },
          } : undefined,
          cvUrl: application.documents?.resume,
        },
      },
      interview: {
        id: interview._id.toString(),
        title: interview.title,
        type: 'async-video',
        position: {
          id: interview._id.toString(),
          title: interview.title,
          description: interview.description,
        },
        questions,
      },
    };
  }

  /**
   * HELPER: AI Server'a interview-record isteği gönder
   */
  private async sendInterviewRecordRequest(
    payload: AIServerInterviewRecordRequest
  ): Promise<AIServerInterviewRecordResponse> {
    const url = `${this.aiServerUrl}/api/interview-record`;
    
    try {
      const { data } = await axios.post<AIServerInterviewRecordResponse>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      
      if (!data.ok) {
        throw new AppError(data.error || 'AI Server error', ErrorCodes.SERVER_ERROR, 500);
      }
      
      return data;
    } catch (error: any) {
      console.error('AI Server error:', error.response?.data || error.message);
      throw new AppError(
        'AI analysis service unavailable or failed to process',
        ErrorCodes.SERVER_ERROR,
        503
      );
    }
  }

  // ==============================================
  // ESKİ API METOTLARI (Geriye Uyumluluk)
  // ==============================================

  /**
   * @deprecated Yeni yapıda startInterviewAnalysis kullanılmalı
   * Bir video yanıtı için AI analizi yapar (ESKİ YÖNTEm)
   */
  public async analyzeSingleVideo(videoResponseId: string) {
    console.warn('⚠️ [DEPRECATED] analyzeSingleVideo kullanımdan kaldırılacak. startInterviewAnalysis kullanın.');
    
    // 1) Video yanıtını bul
    const video = (await VideoResponseModel.findById(videoResponseId)) as (IVideoResponse & Document);
    if (!video) {
      throw new AppError('Video response not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) Başvuru bilgilerini bul
    const application = await ApplicationModel.findById(video.applicationId);
    if (!application) {
      throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
    }

    // 3) Mülakat ve soru bilgilerini bul
    const interview = await InterviewModel.findById(application.interviewId);
    if (!interview) {
      throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
    }

    const question = interview.questions.find(q => q._id?.toString() === video.questionId.toString());
    if (!question) {
      throw new AppError('Question not found in interview', ErrorCodes.NOT_FOUND, 404);
    }

    // 4) AI sunucusuna istek at (ESKİ endpoint)
    const payload = {
      videoUrl: video.videoUrl,
      applicationId: application._id,
      question: {
        text: question.questionText,
        expectedAnswer: question.expectedAnswer,
        keywords: question.keywords,
        order: question.order,
        duration: question.duration,
      },
      interview: {
        title: interview.title,
        stages: interview.stages,
        expirationDate: interview.expirationDate,
      },
    };

    const aiServerUrl = this.aiServerUrl + '/analyzeVideo';
    let aiResult: IAIAnalysisResponse;

    try {
      const { data } = await axios.post<IAIAnalysisResponse>(aiServerUrl, payload);
      aiResult = data;
    } catch (err) {
      console.error('AI server error:', err);
      throw new AppError('AI analysis service unavailable or failed to process', ErrorCodes.SERVER_ERROR, 503);
    }

    // 5) AI analizi kaydet
    const savedAnalysis = await AIAnalysisModel.create({
      videoResponseId: video._id,
      applicationId: application._id,
      questionId: question._id,
      transcriptionText: aiResult.transcriptionText,
      overallScore: aiResult.overallScore,
      technicalSkillsScore: aiResult.technicalSkillsScore,
      communicationScore: aiResult.communicationScore,
      problemSolvingScore: aiResult.problemSolvingScore,
      personalityMatchScore: aiResult.personalityMatchScore,
      keywordMatches: aiResult.keywordMatches,
      strengths: aiResult.strengths,
      improvementAreas: aiResult.improvementAreas,
      recommendation: aiResult.recommendation,
      pipelineStatus: 'done', // Eski API'de direkt tamamlanmış kabul edilir
      analyzedAt: new Date(),
    });

    // 6) Başvuru modelinde yanıtı güncelle
    await ApplicationModel.updateOne(
      {
        _id: application._id.toString(),
        'responses.questionId': video.questionId,
      },
      {
        $set: {
          'responses.$.textAnswer': aiResult.transcriptionText,
        },
      }
    );

    // 7) Video yanıtını işlenmiş olarak güncelle
    (video as any).aiAnalysisId = savedAnalysis._id;
    video.status = 'processed';
    await video.save();

    // 8) Başvuruya ait tüm videoların analiz durumunu kontrol et
    const allVideoResponses = await VideoResponseModel.find({ applicationId: application._id });
    const pendingVideos = allVideoResponses.filter(v => v.status !== 'processed');

    if (pendingVideos.length === 0) {
      await this.calculateGeneralAIAnalysis(application._id.toString());
    }

    return savedAnalysis;
  }
  
  /**
   * Bir başvuruya (application) ait tüm AI analizlerini toplayıp genel bir özet çıkarır
   * 
   * 📋 FAZ 3.1 GÜNCELLEME:
   * - Application.generalAIAnalysis hala yazılıyor (geriye uyumluluk için)
   * - Candidate.scoreSummary güncellenmesi için event tetikleniyor
   */
  public async calculateGeneralAIAnalysis(applicationId: string) {
    // 1) AI analizlerini bul
    const analyses = await AIAnalysisModel.find({ applicationId });

    if (!analyses.length) {
      // Bu, analizlerin tutarsız olduğu anlamına gelir. Akışı kes.
      throw new AppError('No AI analyses found for this application to calculate general summary.', ErrorCodes.NOT_FOUND, 404);
    }

    // 2) Ortalamaları hesapla
    const total = analyses.length;
    const overallScoreSum = analyses.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
    const technicalSkillsSum = analyses.reduce((acc, curr) => acc + (curr.technicalSkillsScore || 0), 0);
    const communicationSum = analyses.reduce((acc, curr) => acc + (curr.communicationScore || 0), 0);
    const problemSolvingSum = analyses.reduce((acc, curr) => acc + (curr.problemSolvingScore || 0), 0);
    const personalityMatchSum = analyses.reduce((acc, curr) => acc + (curr.personalityMatchScore || 0), 0);

    const averageAnalysis = {
      overallScore: Math.round(overallScoreSum / total),
      technicalSkillsScore: Math.round(technicalSkillsSum / total),
      communicationScore: Math.round(communicationSum / total),
      problemSolvingScore: Math.round(problemSolvingSum / total),
      personalityMatchScore: Math.round(personalityMatchSum / total),
    };

    // 3) Strengths ve Areas for Improvement listelerini birleştir
    // ... (Mevcut mantık aynı kalıyor)
    const strengthsSet = new Set<string>();
    const improvementAreasList: { area: string; recommendedAction: string }[] = [];

    analyses.forEach(analysis => {
      (analysis.strengths || []).forEach(strength => strengthsSet.add(strength));
      (analysis.improvementAreas || []).forEach(improvement => {
        if (improvement.area && improvement.recommendation) {
          improvementAreasList.push({
            area: improvement.area,
            recommendedAction: improvement.recommendation,
          });
        }
      });
    });

    // 4) Öneri metinlerini birleştir
    const combinedRecommendations = analyses
      .map(a => a.recommendation)
      .filter(r => r)
      .join(' ');

    // 5) Başvuruyu genel analiz ile güncelle VE DURUMU GÜNCELLE (KRİTİK GÜNCELLEME)
    const latestAnalysis = analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    // @deprecated - Application.generalAIAnalysis FAZ 6'da kaldırılacak
    await ApplicationModel.updateOne(
      { _id: applicationId },
      {
        generalAIAnalysis: {
          ...averageAnalysis,
          strengths: Array.from(strengthsSet),
          areasForImprovement: improvementAreasList,
          recommendation: combinedRecommendations,
        },
        latestAIAnalysisId: latestAnalysis._id,
        // *** EN KRİTİK GÜNCELLEME: BAŞVURU DURUMUNU analysis_completed OLARAK AYARLA ***
        status: 'completed', 
      }
    );

    // ✅ FAZ 3.1: Candidate.scoreSummary güncellemesi için event tetikle
    // Application üzerinden candidateId'yi al ve Candidate servisini çağır
    const application = await ApplicationModel.findById(applicationId).select('candidateId').lean();
    if (application?.candidateId) {
      // Asenkron olarak Candidate skor güncellemesi
      this.updateCandidateScoreSummary(application.candidateId.toString(), averageAnalysis)
        .catch(err => console.error('[FAZ 3.1] Candidate score update error:', err));
    }

    return {
      ...averageAnalysis,
      strengths: Array.from(strengthsSet),
      areasForImprovement: improvementAreasList,
      recommendation: combinedRecommendations,
    };
  }

  /**
   * ✅ YENİ METOD (FAZ 3.1): Candidate scoreSummary güncellemesi
   * AI Analysis tamamlandığında Candidate'in skor özetini günceller
   */
  private async updateCandidateScoreSummary(
    candidateId: string,
    newScores: {
      overallScore: number;
      technicalSkillsScore: number;
      communicationScore: number;
      problemSolvingScore: number;
      personalityMatchScore: number;
    }
  ): Promise<void> {
    // Lazy import to avoid circular dependency
    const CandidateModel = (await import('../../candidates/models/candidate.model')).default;
    
    const candidate = await CandidateModel.findById(candidateId);
    if (!candidate) {
      console.warn(`[FAZ 3.1] Candidate not found for score update: ${candidateId}`);
      return;
    }

    const currentSummary = candidate.scoreSummary || {
      totalInterviews: 0,
      completedInterviews: 0
    };

    // Atomic update - mevcut ortalamaları yeni skorlarla güncelle
    const completedCount = (currentSummary.completedInterviews || 0) + 1;
    
    // Weighted average hesaplama (mevcut ortalama + yeni skor)
    const updateAvg = (current: number | undefined, newVal: number, count: number): number => {
      if (!current || count === 1) return newVal;
      return Math.round(((current * (count - 1)) + newVal) / count);
    };

    await CandidateModel.updateOne(
      { _id: candidateId },
      {
        $set: {
          'scoreSummary.avgOverallScore': updateAvg(currentSummary.avgOverallScore, newScores.overallScore, completedCount),
          'scoreSummary.avgTechnicalScore': updateAvg(currentSummary.avgTechnicalScore, newScores.technicalSkillsScore, completedCount),
          'scoreSummary.avgCommunicationScore': updateAvg(currentSummary.avgCommunicationScore, newScores.communicationScore, completedCount),
          'scoreSummary.avgProblemSolvingScore': updateAvg(currentSummary.avgProblemSolvingScore, newScores.problemSolvingScore, completedCount),
          'scoreSummary.avgPersonalityScore': updateAvg(currentSummary.avgPersonalityScore, newScores.personalityMatchScore, completedCount),
          'scoreSummary.lastScore': newScores.overallScore,
          'scoreSummary.lastScoreDate': new Date(),
          'scoreSummary.completedInterviews': completedCount
        }
      }
    );

    console.log(`✅ [FAZ 3.1] Candidate ${candidateId} scoreSummary updated. Completed: ${completedCount}`);
  }
}