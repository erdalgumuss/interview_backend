import axios from 'axios';
import VideoResponseModel from '../../video/models/videoResponse.model';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import AIAnalysisModel from '../models/aiAnalysis.model';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

export class AIAnalysisService {
  /**
   * Bir video yanıtı için AI analizi yapar
   */
  public async analyzeSingleVideo(videoResponseId: string) {
    // 1) Video yanıtını bul
    const video = await VideoResponseModel.findById(videoResponseId);
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

    // 4) AI sunucusuna istek at
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

    const aiServerUrl = process.env.AI_SERVER_URL + '/analyzeVideo'; // Örneğin .env'den gelecek

    let aiResult;
    try {
      const { data } = await axios.post(aiServerUrl, payload);
      aiResult = data;
    } catch (err) {
      console.error('AI server error:', err);
      throw new AppError('AI analysis service unavailable', ErrorCodes.SERVER_ERROR, 503);
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
      analyzedAt: new Date(),
    });

    // 6) Başvuru modelinde yanıtı güncelle
    await ApplicationModel.updateOne(
      {
        _id: application._id,
        'responses.questionId': video.questionId,
      },
      {
        $set: {
          'responses.$.textAnswer': aiResult.transcriptionText,
        },
      }
    );

    // 7) Video yanıtını işlenmiş olarak güncelle
    video.status = 'processed';
    video.aiAnalysisId = savedAnalysis._id;
    await video.save();

    return savedAnalysis;
  }
  
  /**
   * Bir başvuruya (application) ait tüm AI analizlerini toplayıp genel bir özet çıkarır
   */
  public async calculateGeneralAIAnalysis(applicationId: string) {
    // 1) AI analizlerini bul
    const analyses = await AIAnalysisModel.find({ applicationId });

    if (!analyses.length) {
      throw new AppError('No AI analyses found for this application', ErrorCodes.NOT_FOUND, 404);
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

    // 5) Başvuruyu güncelle
    const latestAnalysis = analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

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
      }
    );

    return {
      ...averageAnalysis,
      strengths: Array.from(strengthsSet),
      areasForImprovement: improvementAreasList,
      recommendation: combinedRecommendations,
    };
  }
}
