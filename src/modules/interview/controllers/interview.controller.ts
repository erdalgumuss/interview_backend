import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { InterviewStatus } from '../models/interview.model'; 

class InterviewController {
    private interviewService: InterviewService;

    constructor() {
        this.interviewService = new InterviewService();
    }

    /**
     * POST /interviews - Yeni mülakat oluşturma.
     */
    public async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as CreateInterviewDTO;
            const userId = req.user?.id as string;

            if (!userId) {
                // Bu durum, genellikle auth middleware tarafından zaten yakalanmalıdır, ancak ek kontrol.
                return next(new AppError('User authentication failed', ErrorCodes.UNAUTHORIZED, 401));
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
                return next(new AppError('Forbidden: Admin access required', ErrorCodes.UNAUTHORIZED, 403));
            }

            const interviews = await this.interviewService.getAllInterviews();
            res.json({ success: true, data: interviews });
        } catch (error) {
            next(error);
        }
    };

  /**
     * GET /interviews/my - Kullanıcının oluşturduğu mülakatları getir. (Mevcut metot)
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
     * Bu metot, DashboardPage'in 404 hatasını çözer.
     */
    public getDashboardData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401);
            }

            // Service'ten toplu dashboard verisini çek
            const dashboardData = await this.interviewService.getDashboardData(userId);
            
            // Frontend'in beklediği yapıda yanıt dön (DashboardDataDTO)
            // success: true ve tüm istatistik alanları döndürülüyor.
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
    
            // Sahiplik Kontrolü
            if (existingInterview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot update other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }
            
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
    
            // Sahiplik Kontrolü
            if (interview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot delete other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }
    
            await this.interviewService.deleteInterview(id); // Veya softDeleteInterview(id, userId);
    
            res.json({ success: true, message: 'Interview deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /interviews/:id/publish - Mülakatı yayınlama (DRAFT -> PUBLISHED).
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
            if (interview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot publish other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }

            // Servis'e iş mantığını devret
            const updatedInterview = await this.interviewService.publishInterview(id);

            res.json({ success: true, data: updatedInterview });
        } catch (error) {
            // Servis'ten gelen iş mantığı hataları (400 Bad Request) burada yakalanır
            next(error); 
        }
    }

    /**
     * POST /interviews/:id/link - Mülakat linkini yeniden oluşturma/güncelleme.
     * Link oluşturma mantığı Servis'te olmalıdır. Burada sadece veriyi güncelleyen genel update kullanıldı.
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
            
            // Sahiplik Kontrolü
            if (interview.createdBy.userId.toString() !== userId) {
                throw new AppError('Forbidden: Cannot update link for other user interviews', ErrorCodes.UNAUTHORIZED, 403);
            }

            // Link oluşturma mantığı burada (Controller) olduğu için bir risk taşır.
            // Bu mantık Servis'e taşınmalıdır.
            const link = `https://localhost:3001/application/${id}`;
            const updatedInterview = await this.interviewService.updateInterview(id, {
                interviewLink: {
                    link,
                    expirationDate: expirationDate ? new Date(expirationDate) : interview.interviewLink.expirationDate, // Süre verilmezse eskisini koru
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
