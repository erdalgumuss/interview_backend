import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        'https://yourdomain.com', // Production domain - bunu gerçek domain ile değiştirin
      ],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'] as ('GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD')[],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function configureBucketCors() {
  const bucketName = process.env.AWS_S3_BUCKET || 'chat-sistem-video-kayitlari';
  
  console.log('🔧 S3 CORS Yapılandırması Başlıyor...');
  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`🌍 Region: ${process.env.AWS_S3_REGION || 'eu-north-1'}`);
  console.log(`🔑 Access Key ID: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);

  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);
    console.log('✅ CORS yapılandırması başarıyla uygulandı!');
    console.log('📋 Yapılandırma detayları:');
    console.log(JSON.stringify(corsConfiguration, null, 2));
  } catch (error: any) {
    console.error('❌ CORS yapılandırması başarısız:', error.message);
    if (error.Code) {
      console.error(`   Error Code: ${error.Code}`);
    }
    process.exit(1);
  }
}

configureBucketCors();
