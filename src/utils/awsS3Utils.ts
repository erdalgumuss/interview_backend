// src/utils/awsS3Utils.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const region = process.env.AWS_S3_REGION
const bucketName = process.env.AWS_S3_BUCKET

// AWS S3 Client
const s3 = new S3Client({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * S3'e dosya yükler, yüklenen dosyanın public URL'sini döndürür
 */
export async function uploadFileToS3(fileBuffer: Buffer, originalName: string): Promise<string> {
    // 1) Benzersiz bir dosya adı oluştur
    const extension = path.extname(originalName); // .jpg, .png, vs.
    const fileKey = `profile_pics/${uuidv4()}${extension}`;

    // 2) PutObject komutuyla S3'e yükleme
    await s3.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: getContentType(extension),
        })
    );

    // 3) Dosyanın public URL'sini döndür
    return `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
}

/**
 * (Opsiyonel) S3'ten dosya silme
 */
export async function deleteFileFromS3(fileUrl: string) {
    // Dosya anahtarını URL'den tespit edelim
    // https://my-bucket.s3.us-east-1.amazonaws.com/profile_pics/UUID.jpg
    const fileKey = fileUrl.split('.amazonaws.com/')[1];

    await s3.send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        })
    );
}

/**
 * Basit uzantı -> ContentType tahmini
 */
function getContentType(extension: string): string {
    switch (extension.toLowerCase()) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        default:
            return 'application/octet-stream';
    }
}
