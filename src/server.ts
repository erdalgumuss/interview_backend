const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// KRİTİK DEĞİŞİKLİK: Local import'lar için require() kullanılıyor
const connectDB = require('./config/db');
const routerModule = require('./routes/index');
const rootRouter = routerModule.default || routerModule; // Hem default hem de doğrudan export'u destekle
const cookieParser = require('cookie-parser');
import { errorMiddleware } from './middlewares/errorMiddleware'; 

// ----------------------------------------------------
// 🚀 KRİTİK GÜNCELLEME: Mongoose Modellerini Yükleme
// Side-effect (yan etki) importlar için require() kullanıldı.
// ----------------------------------------------------
require('./modules/auth/models/user.model');         // User Model
require('./modules/application/models/application.model'); // Application Model
require('./modules/interview/models/interview.model'); // Interview Model
require('./modules/aiAnalysis/models/aiAnalysis.model'); // AI Analysis Model
require('./modules/video/models/videoResponse.model'); // Video Response Model
// ----------------------------------------------------

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
app.use(errorMiddleware); 

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
