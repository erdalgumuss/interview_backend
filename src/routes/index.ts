// src/routes/index.ts (veya src/app.ts)
import { Application } from 'express';
import authRoutes from '../modules/auth/routes/auth.routes';
import profileRoutes from '../modules/auth/routes/profile.routes';
import interviewRoutes from '../modules/interview/routes/interview.routes';
import publicInterviewRouter from '../modules/application/routes/candidate.routes';
import appointmentRoutes from '../modules/interview/appointment/routes/appointment.routes'; 


const loadRoutes = (app: Application): void => {

    
    app.use('/api/auth', authRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/interviews', interviewRoutes);
    //app.use('/api/public', publicInterviewRouter);
    app.use('/api/appointments', appointmentRoutes);

}
export default loadRoutes;
