import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

class ApplicationController {
  private applicationService: ApplicationService;

  constructor() {
    this.applicationService = new ApplicationService();
  }

  /**
   * Tek başvuru görüntüleme
   * Sadece mülakat sahibi erişebilir
   */
  public getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;      // Uygulama ID
      const userId = req.user?.id;    // HR kullanıcının ID'si (JWT'den)

      if (!userId) {
        return next(new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 401));
      }

      const application = await this.applicationService.getApplicationById(id, userId);

      res.status(200).json({
        success: true,
        data: application
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ApplicationController();
