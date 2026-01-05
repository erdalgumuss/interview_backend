import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { UpdateInterviewDTO } from '../dtos/updateInterview.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { InterviewStatus, IInterview } from '../models/interview.model'; 

class InterviewController {
    private interviewService: InterviewService;

    constructor() {
        this.interviewService = new InterviewService();
    }

    /**
     * Yardımcı Metot: Mülakat sahipliğini kontrol eder.
     * Eğer kullanıcı mülakatın sahibi değilse hata fırlatır.
     */
    private checkOwnership(interview: IInterview, userId: string): void {
        const createdBy = interview.createdBy.userId;
        
        // Populate edilmişse ._id, değilse kendisi
        const ownerId = (createdBy as any)._id || createdBy;

        // Mongoose ObjectId karşılaştırması veya String karşılaştırması
        const isOwner = (ownerId as any).equals 
            ? (ownerId as any).equals(userId) 
            : ownerId.toString() === userId;

        if (!isOwner) {
            throw new AppError(
                'Forbidden: You do not have permission to access this interview.', 
                ErrorCodes.UNAUTHORIZED, 
                403
            );
        }
    }

    /**
     * POST /interviews - Yeni mülakat oluşturma.
     */
    public async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
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
     * GET /interviews/admin - Tüm mülakatları getir (Sadece Admin).
     */
    public getAllInterviews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'admin') {
                return next(new AppError('Forbidden: Admin access required', ErrorCodes.UNAUTHORIZED, 403));
            }

            const interviews = await this.interviewService.getAllInterviews();
            res.json({ success: true, data: interviews });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /interviews/my - Kullanıcının oluşturduğu mülakatları getir.
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
     * GET /interviews/dashboard - Dashboard verilerini getirir.
     */
    public getDashboardData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            const dashboardData = await this.interviewService.getDashboardData(userId);
            res.json({ success: true, ...dashboardData }); 
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /interviews/:id - Tek bir mülakatı getir (Gizlilik Kontrollü).
     */
     public getInterviewById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const interview = await this.interviewService.getInterviewById(id);

            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
            
            if (!userId) {
                 throw new AppError('Unauthorized access', ErrorCodes.UNAUTHORIZED, 401);
            }

            // Sahiplik Kontrolü
            try {
                this.checkOwnership(interview, userId);
            } catch (error) {
                // Eğer sahibi değilse ama mülakat DRAFT ise 404 dön (Gizlilik)
                // PUBLISHED ise belki aday görüyordur, o yüzden direkt 403 atmıyoruz (Senaryoya göre değişir)
                // Şimdilik kuralımız: Sahibi değilse detay göremez.
                if (interview.status === InterviewStatus.DRAFT) {
                    throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
                }
                throw error; // Diğer durumlarda 403 fırlat
            }

            res.json({ success: true, data: interview });
        } catch (error) {
            next(error);
        }
    };
    
    /**
     * PUT /interviews/:id - Mülakat güncelleme
     */
    public async updateInterview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updateData = req.body as UpdateInterviewDTO;
            const userId = req.user?.id;
    
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }
    
            const existingInterview = await this.interviewService.getInterviewById(id);
            if (!existingInterview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
    
            // ✅ Sahiplik kontrolü tek satıra indi
            this.checkOwnership(existingInterview, userId);
            
            const updatedInterview = await this.interviewService.updateInterview(
            id, 
            updateData as unknown as Partial<IInterview>
            );    
            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * DELETE /interviews/:id - Mülakatı sil.
     */
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
    
            // ✅ Sahiplik kontrolü
            this.checkOwnership(interview, userId);
            
            await this.interviewService.deleteInterview(id);
    
            res.json({ success: true, message: 'Interview deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /interviews/:id/publish - Mülakatı yayınlama.
     */
    public async publishInterview(req: Request, res: Response, next: NextFunction) {
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

            // ✅ Sahiplik kontrolü
            this.checkOwnership(interview, userId);

            const updatedInterview = await this.interviewService.publishInterview(id);

            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            next(error); 
        }
    }

    /**
     * PATCH /interviews/:id/link - Mülakat süresini uzatma / link güncelleme.
     */
    public async generateInterviewLink(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { expirationDate } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }
            
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                return next(new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404));
            }
            
            // ✅ Sahiplik kontrolü
            this.checkOwnership(interview, userId);

            // ⚠️ DÜZELTME: Linki yeniden oluşturmuyoruz, mevcut linki koruyup sadece süreyi güncelliyoruz.
            // Link string'i ID'ye bağlı olduğu için değişmez.
            const currentLink = interview.interviewLink?.link;

            const updatedInterview = await this.interviewService.updateInterview(id, {
                interviewLink: {
                    link: currentLink, // Mevcut linki koru
                    expirationDate: expirationDate ? new Date(expirationDate) : interview.interviewLink.expirationDate, 
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
}

export default new InterviewController();