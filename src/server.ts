import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db';
import rootRouter from './routes/index';
import cookieParser from 'cookie-parser';
//import { interviewStatusJob } from './jobs/interviewStatus.job';


// Uygulama
const app = express();
//interviewStatusJob(); // CRON Job başlat!

// Middleware'ler
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000', // React veya Next.js frontend URL
        credentials: true, // Cookies gönderilmesine izin ver
    })
);
app.use(cookieParser()); // Cookieleri okumak için
app.use(express.urlencoded({ extended: true }));

// Veritabanına bağlan
connectDB();
// Rotalar (dinamik olarak yüklenir)
rootRouter(app);

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


