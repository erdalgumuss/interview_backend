// src/services/s3.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client yapılandırması
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'chat-sistem-video-kayitlari';

export class S3Service {
  /**
   * Dosya yükleme için presigned URL oluşturur
   */
  public async getUploadPresignedUrl(
    key: string, 
    contentType: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Dosya indirme için presigned URL oluşturur
   */
  public async getDownloadPresignedUrl(
    key: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Dosyayı S3'ten siler
   */
  public async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * S3 URL'ini oluşturur (public erişim için)
   */
  public getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
  }
}

// Singleton instance
export const s3Service = new S3Service();
export default s3Service;
