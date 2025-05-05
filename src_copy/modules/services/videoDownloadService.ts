import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const downloadVideo = async (videoUrl: string): Promise<string> => {
  const fileName = `video_${Date.now()}.mp4`;
  const filePath = path.resolve('/tmp', fileName);
  const writer = fs.createWriteStream(filePath);

  const response = await axios.get(videoUrl, { responseType: 'stream' });
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => resolve());
    writer.on('error', reject);
  });
  

  return filePath;
};
