// src/modules/interview/routes/interview.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import interviewController from '../controllers/interview.controller'; 
import { authenticate } from '../../../middlewares/auth';
import { validateRequest } from '../../../middlewares/validationMiddleware';
import { createInterviewSchema } from '../dtos/createInterview.dto';
import { updateInterviewSchema } from '../dtos/updateInterview.dto'; 

const router = Router();

// Express'in async hataları yakalayabilmesi için wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
};

// --- MÜLAKAT OLUŞTURMA (POST) ---
router.post(
    '/', 
    authenticate, 
    validateRequest(createInterviewSchema), 
    asyncHandler(interviewController.createInterview.bind(interviewController))
);

// --- MÜLAKAT GÜNCELLEME (PUT) ---
router.put(
    '/:id', 
    authenticate, 
    validateRequest(updateInterviewSchema), 
    asyncHandler(interviewController.updateInterview.bind(interviewController))
);

// --- MÜLAKAT YAYINLAMA (PATCH) ---
router.patch(
    '/:id/publish', 
    authenticate, 
    asyncHandler(interviewController.publishInterview.bind(interviewController))
);

// --- MÜLAKAT LİNKİ GÜNCELLEME / YENİLEME (PATCH) ---
router.patch(
    '/:id/link', 
    authenticate, 
    asyncHandler(interviewController.generateInterviewLink.bind(interviewController))
);

// --- MÜLAKAT SİLME (DELETE) ---
router.delete(
    '/:id', 
    authenticate, 
    asyncHandler(interviewController.deleteInterview.bind(interviewController))
);

// --- SORGULAMA (GET) ---
router.get(
    '/all', 
    authenticate, 
    asyncHandler(interviewController.getAllInterviews.bind(interviewController))
);

router.get(
    '/my', 
    authenticate, 
    asyncHandler(interviewController.getUserInterviews.bind(interviewController))
);

router.get(
    '/dashboard', 
    authenticate, 
    asyncHandler(interviewController.getDashboardData.bind(interviewController))
);

router.get(
    '/:id', 
    authenticate, 
    asyncHandler(interviewController.getInterviewById.bind(interviewController))
);

export default router;