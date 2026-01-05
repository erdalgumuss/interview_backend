// src/routes/index.ts (veya src/app.ts)
import { Application } from 'express';
import authRoutes from '../modules/auth/routes/auth.routes';
import profileRoutes from '../modules/auth/routes/profile.routes';
import interviewRoutes from '../modules/interview/routes/interview.routes';
import publicInterviewRouter from '../modules/application/routes/public-candidate.routes';
import appointmentRoutes from '../modules/interview/appointment/routes/appointment.routes'; 
import applicationRoutes from '../modules/application/routes/application.routes';
import reportsRoutes from '../modules/reports/routes/reports.routes';
import candidatesRoutes from '../modules/candidates/routes/candidate.routes';


const loadRoutes = (app: Application): void => {

    
    app.use('/api/auth', authRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/interviews', interviewRoutes);
    app.use('/api/public', publicInterviewRouter);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/applications', applicationRoutes); // Yeni eklenen rota
    app.use('/api/reports', reportsRoutes); // Reports modülü
    app.use('/api/candidates', candidatesRoutes); // Aday havuzu modülü

}
export default loadRoutes;
