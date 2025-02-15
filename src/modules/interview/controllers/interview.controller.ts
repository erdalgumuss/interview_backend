import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

class InterviewController {
    private interviewService: InterviewService;

    constructor() {
        this.interviewService = new InterviewService();
    }


    public async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log('📥 Gelen Body:', req.body); // Log ekledik

            const body = req.body as CreateInterviewDTO;
            const userId = req.user?.id as string;

            if (!userId ) {
             res.status(400).json({ success: false, message: "User authentication failed" });
                return;
            }

            const newInterview = await this.interviewService.createInterview(body, userId);

             res.status(201).json({ success: true, data: newInterview });
             return;
        } catch (error) {
            next(error);
        }
    };

    /**
     * Tüm mülakatları getir (Sadece Admin)
     */
    public getAllInterviews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'admin') {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403);
            }

            const interviews = await this.interviewService.getAllInterviews();
            res.json({ success: true, data: interviews });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Kullanıcının mülakatlarını getir.
     */
    public getUserInterviews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            const interviews = await this.interviewService.getInterviewsByUser(userId);
            res.json({ success: true, data: interviews });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Tek bir mülakatı getir.
     */
    public getInterviewById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const interview = await this.interviewService.getInterviewById(id);

            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }

            res.json({ success: true, data: interview });
        } catch (error) {
            next(error);
        }
    };
    public async updateInterview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const userId = req.user?.id;
    
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            const existingInterview = await this.interviewService.getInterviewById(id);
            if (!existingInterview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
    
            // Kullanıcı yalnızca kendi mülakatlarını güncelleyebilir
            if (existingInterview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot update other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }
    
            const updatedInterview = await this.interviewService.updateInterview(id, updateData);
    
            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            next(error);
        }
    }
    
    public async deleteInterview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
    
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
    
            // Kullanıcı yalnızca kendi mülakatlarını silebilir
            if (interview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot delete other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }
    
            await this.interviewService.deleteInterview(id);
    
            res.json({ success: true, message: 'Interview deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export default new InterviewController();
