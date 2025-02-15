// src/middlewares/upload.ts
import multer from 'multer';

// Bellekte tutalım, S3'e yükleyeceğiz
const storage = multer.memoryStorage();

export const upload = multer({ storage });
