import { videoAnalysisQueue } from '../videoAnalysis/videoAnalysisQueue.ts';

export const addVideoAnalysisJob = async (data: any) => {
  await videoAnalysisQueue.add('analyze-video', data, {
    attempts: 3, // Hata olursa 3 kez tekrar dener
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 saniye gecikmeli retry
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
};
