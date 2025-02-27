import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';
import { InterviewStatus } from '../models/interview.model'; // Adjust the path as necessary

class InterviewController {
    private interviewService: InterviewService;

    constructor() {
        this.interviewService = new InterviewService();
    }

    public async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            console.log('📥 Gelen Body:', req.body);

            const body = req.body as CreateInterviewDTO;
            const userId = req.user?.id as string;

            if (!userId) {
                return next(new AppError('User authentication failed', ErrorCodes.UNAUTHORIZED, 401));
            }

            const newInterview = await this.interviewService.createInterview(body, userId);
            res.status(201).json({ success: true, data: newInterview });
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
                return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403));
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

    public async updateInterviewStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { newStatus } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
            }

            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                return next(new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404));
            }

            if (interview.createdBy.userId.toString() !== userId) {
                return next(new AppError('Forbidden: Cannot update other user interviews', ErrorCodes.UNAUTHORIZED, 403));
            }

            if (interview.status === InterviewStatus.DRAFT && newStatus === InterviewStatus.PUBLISHED) {
                interview.status = InterviewStatus.PUBLISHED;
            } else if (interview.status === InterviewStatus.PUBLISHED && newStatus === InterviewStatus.INACTIVE) {
                interview.status = InterviewStatus.INACTIVE;
            } else {
                return next(new AppError('Invalid status transition', ErrorCodes.BAD_REQUEST, 400));
            }

            const updatedInterview = await this.interviewService.updateInterview(id, { status: interview.status });
            res.json({ success: true, data: updatedInterview });

        } catch (error) {
            next(error);
        }
    }

    public async generateInterviewLink(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { expirationDate } = req.body;

            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                return next(new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404));
            }

            const link = `https://localhost:3001/application/${id}`;
            const updatedInterview = await this.interviewService.updateInterview(interview.id, {
                interviewLink: {
                    link,
                    expirationDate: expirationDate ? new Date(expirationDate) : undefined,
                }
            });

            if (!updatedInterview) {
                return next(new AppError('Failed to update interview', ErrorCodes.INTERNAL_SERVER_ERROR, 500));
            }
            res.json({ success: true, data: updatedInterview.interviewLink });
        } catch (error) {
            next(error);
        }
    }


    public async updateInterviewQuestions(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { questions } = req.body; // Yeni soru listesi
    
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
    
            interview.questions = questions;
            await interview.save();
    
            res.json({ success: true, data: interview.questions });
        } catch (error) {
            next(error);
        }
    }
    public async updatePersonalityTest(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { personalityTestId } = req.body;
    
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
    
            interview.personalityTestId = personalityTestId ? new mongoose.Types.ObjectId(personalityTestId) : undefined;
            await interview.save();
    
            res.json({ success: true, data: interview });
        } catch (error) {
            next(error);
        }
    }
    
    
}

export default new InterviewController();
