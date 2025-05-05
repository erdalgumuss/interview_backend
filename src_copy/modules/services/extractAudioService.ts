import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

export const extractAudioFromVideo = (videoPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const audioPath = path.resolve('/tmp', `audio_${Date.now()}.mp3`);

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .format('mp3')
      .save(audioPath)
      .on('end', () => {
        console.log('🎵 Audio extraction completed:', audioPath);
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('⚠️ Audio extraction failed', err);
        reject(err);
      });
  });
};
