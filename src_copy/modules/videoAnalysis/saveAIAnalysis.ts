import { AIAnalysisModel } from '../models/AIAnalysisModel.ts';
import { VideoResponseModel } from '../models/VideoResponseModel.ts';
import mongoose from 'mongoose';

export const saveAIAnalysisResult = async ({
  videoResponseId,
  applicationId,
  transcription,
  gptResult,
  faceResult,
  voiceResult,
  overallScore,
  communicationScore,

}: {
  videoResponseId: string;
  applicationId: string;
  transcription: string;
  gptResult: any;
  faceResult: {
    engagementScore: number;
    confidenceScore: number;
    emotionLabel: string;

  };
  voiceResult: {
    speechFluencyScore: number;
    voiceConfidenceScore: number;
    voiceEmotionLabel: string;
  };
  overallScore: number;
  communicationScore: number;
  
}) => {
  // MongoDB'de AI analizi kaydet
  const aiAnalysisDoc = await AIAnalysisModel.create({
    transcriptionText: transcription,
    overallScore: gptResult.answerRelevanceScore,
    technicalSkillsScore: gptResult.technicalSkillsScore ?? null,
    communicationScore: gptResult.communicationScore ?? null,
    problemSolvingScore: gptResult.problemSolvingScore ?? null,
    personalityMatchScore: gptResult.personalityMatchScore ?? null,
    keywordMatches: gptResult.keywordMatches,
    strengths: gptResult.strengths,
    improvementAreas: gptResult.improvementAreas,
    recommendation: gptResult.recommendation,   
    engagementScore: faceResult.engagementScore,
    confidenceScore: faceResult.confidenceScore,
    faceEmotionLabel: faceResult.emotionLabel,
    speechFluencyScore: voiceResult.speechFluencyScore,
    voiceConfidenceScore: voiceResult.voiceConfidenceScore,
    voiceEmotionLabel: voiceResult.voiceEmotionLabel,

    analyzedAt: new Date(),
  });

  // İlgili video kaydını güncelle
  await VideoResponseModel.findByIdAndUpdate(
    videoResponseId,
    {
      status: 'processed',
      aiAnalysisId: aiAnalysisDoc._id,
    },
    { new: true }
  );

  return aiAnalysisDoc;
};
