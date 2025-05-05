import { downloadVideo } from '../services/videoDownloadService.ts';
import { getTranscription } from '../services/whisperService.ts';
import { extractAudioFromVideo } from '../services/extractAudioService.ts';
import { analyzeWithGPT } from '../services/gptService.ts';
import { saveAIAnalysisResult } from './saveAIAnalysis.ts';
import { analyzeVoiceProsody } from '../services/voiceProsodyService.ts';

import fs from 'fs';
import { analyzeFaceAndGestures } from '../services/faceAnalysisService.ts';
import { calculateFinalScores } from '../services/aiScoreCalculator.ts';

export const processVideoAnalysis = async (jobData: any) => {
  const { videoUrl, question, interview } = jobData;

  console.log('🎬 Step 1: Downloading video...');
  const videoPath = await downloadVideo(videoUrl);

  console.log('🎵 Step 2: Extracting audio...');
  const audioPath = await extractAudioFromVideo(videoPath);

  console.log('🗣️ Step 3: Getting transcription from Whisper...');
  const transcription = await getTranscription(audioPath);
  console.log('📝 Transcription:', transcription);

  console.log('🤖 Step 4: Analyzing with GPT...');
  const gptResult = await analyzeWithGPT(
    question?.text || '',
    question?.expectedAnswer || '',
    transcription,
    question?.keywords || [],
    interview?.title || ''
  );

  console.log('📊 GPT Analysis:', gptResult);
  
  console.log('🎭 Step 5: Analyzing face expressions...');
  const faceResult = await analyzeFaceAndGestures(videoPath);
  console.log('🧠 Face Analysis:', faceResult);

  console.log('🔊 Step 6: Analyzing voice prosody...');
const voiceResult = await analyzeVoiceProsody(audioPath);
console.log('📈 Voice Analysis:', voiceResult);

console.log('📊 Step 7: Calculating final scores...');
const { communicationScore, overallScore } = calculateFinalScores({
  gptScore: gptResult.answerRelevanceScore,
  confidenceScore: faceResult.confidenceScore,
  voiceConfidenceScore: voiceResult.voiceConfidenceScore,
  speechFluencyScore: voiceResult.speechFluencyScore,
});
console.log('🧮 Final Scores:', { communicationScore, overallScore });



  console.log('💾 Step 5: Saving AI analysis to DB...');
  const savedResult = await saveAIAnalysisResult({
    videoResponseId: jobData.videoResponseId,
    applicationId: jobData.applicationId,
    voiceResult,
    transcription,
    gptResult,
    faceResult,
    overallScore,
    communicationScore,
  });

  // Geçici dosyaları temizle
  fs.unlink(videoPath, (err) => {
    if (err) console.error('⚠️ Failed to delete temp video file:', err);
    else console.log('🧹 Temp video file deleted');
  });

  fs.unlink(audioPath, (err) => {
    if (err) console.error('⚠️ Failed to delete temp audio file:', err);
    else console.log('🧹 Temp audio file deleted');
  });

  return {
    transcription,
    gptResult,
    savedAnalysisId: savedResult._id,
    videoUrl,
  };
};
