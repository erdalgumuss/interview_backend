import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { IInterview, InterviewStatus } from '../models/interview.model'; 
import { check } from 'express-validator';
import { ApplicationService } from '../../application/services/application.service';

class InterviewController {
    private interviewService: InterviewService;
    private applicationService: ApplicationService;

    constructor() {
        this.interviewService = new InterviewService();
        this.applicationService = new ApplicationService();
    }

    /**
     * POST /interviews - Yeni mülakat oluşturma.
     */
    public async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as CreateInterviewDTO;
            const userId = req.user?.id as string;

            if (!userId) {
                throw new AppError('User authentication failed', ErrorCodes.UNAUTHORIZED, 401);
            }

            const newInterview = await this.interviewService.createInterview(body, userId);
            res.status(201).json({ success: true, data: newInterview });
        } catch (error) {
            // Servis'ten fırlatılan iş mantığı hataları (örneğin: 'Interview must contain at least one question') burada yakalanır.
            // Bu hataların doğru HTTP kodlarına (400 Bad Request) dönüştürülmesi gerekiyor (Bkz: Sonraki Adım).
            next(error);
        }
    };
    
    /**
     * GET /interviews/admin - Tüm mülakatları getir (Sadece Admin).
     */
    public getAllInterviews = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'admin') {
                throw new AppError('Forbidden: Admin access required', ErrorCodes.UNAUTHORIZED, 403);
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

            // Gizlilik Kontrolü: Yalnızca sahibi DRAFT mülakatı görebilir.
            // PUBLISHED olanlar, aday rotasından erişilebilir (farklı bir controller/rota olmalı).
            if (interview.status === InterviewStatus.DRAFT && interview.createdBy.userId.toString() !== userId) {
                 // 404 döndürerek mülakatın varlığını gizliyoruz.
                 throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }

            res.json({ success: true, data: interview });
        } catch (error) {
            next(error);
        }
    };
    
    /**
     * PUT /interviews/:id - Mülakat güncelleme (Başlık, Süre, vb.)
     * Bu metot artık Soru ve Kişilik Testi güncellemelerini de kapsar.
     */
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
    
            // Sahiplik Kontrolü (helper method kullanıyor)
            this.checkOwnership(existingInterview, userId);
            
            // Güncelleme işlemi Servis katmanında yapılır
            const updatedInterview = await this.interviewService.updateInterview(id, updateData);
    
            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * DELETE /interviews/:id - Mülakatı soft-delete veya hard-delete yap.
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
    
            // Sahiplik Kontrolü (helper method kullanıyor)
            this.checkOwnership(interview, userId);

            await this.interviewService.deleteInterview(id);
    
            res.json({ success: true, message: 'Interview deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /interviews/:id/publish - Mülakatı yayınlama (DRAFT -> PUBLISHED).
     */
    public async publishInterview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            // Mülakatı çekme ve Sahiplik Kontrolü
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                 throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }
            
            // Sahiplik Kontrolü (helper method kullanıyor)
            this.checkOwnership(interview, userId);

            // Servis'e iş mantığını devret
            const updatedInterview = await this.interviewService.publishInterview(id);

            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            // Servis'ten gelen iş mantığı hataları (400 Bad Request) burada yakalanır
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
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
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
                throw new AppError('Failed to update interview', ErrorCodes.INTERNAL_SERVER_ERROR, 500);
            }
            res.json({ success: true, data: updatedInterview.interviewLink });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /interviews/:id/applications - Mülakata ait başvuruları listele
     * Sadece mülakat sahibi erişebilir.
     * Query params: ?page=1&limit=10&status=completed&sortBy=createdAt&sortOrder=desc
     */
    public async getInterviewApplications(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            // Mülakatı kontrol et
            const interview = await this.interviewService.getInterviewById(id);
            if (!interview) {
                throw new AppError('Interview not found', ErrorCodes.NOT_FOUND, 404);
            }

            // Sahiplik kontrolü
            this.checkOwnership(interview, userId);

            // Query parametreleri
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string | undefined;
            const sortBy = (req.query.sortBy as string) || 'createdAt';
            const sortOrder = (req.query.sortOrder as string) || 'desc';

            // Başvuruları çek
            const result = await this.applicationService.getApplicationsByInterviewId(
                id,
                { page, limit, status, sortBy, sortOrder }
            );

            res.json({
                success: true,
                data: result.applications,
                meta: {
                    total: result.total,
                    page,
                    limit,
                    totalPages: Math.ceil(result.total / limit),
                    interviewTitle: interview.title
                }
            });
        } catch (error) {
            next(error);
        }
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
}

export default new InterviewController();
