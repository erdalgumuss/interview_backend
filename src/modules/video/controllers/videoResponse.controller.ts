import { Request, Response, NextFunction } from 'express';
import { VideoResponseService } from '../services/videoResponse.service';
import { uploadVideoResponseSchema, getVideoResponsesSchema } from '../dtos/videoResponse.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import { CandidateAuthRequest } from '../../../middlewares/candidateAuth.middleware';

class VideoResponseController {
    private videoResponseService: VideoResponseService;

    constructor() {
        this.videoResponseService = new VideoResponseService();
    }

    /**
     * ✅ Adayın video yanıtını yüklemesi
     */
    public uploadVideoResponse = async (req: CandidateAuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.candidate) {
                throw new AppError('Unauthorized request', ErrorCodes.UNAUTHORIZED, 401);
            }

            const { error } = uploadVideoResponseSchema.validate(req.body);
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const videoResponse = await this.videoResponseService.uploadVideoResponse({
                ...req.body,
                applicationId: req.candidate.applicationId,
            });

            res.status(201).json({ success: true, data: videoResponse });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Adayın yüklediği tüm video yanıtlarını getir
     */
    public getVideoResponses = async (req: CandidateAuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.candidate) {
                throw new AppError('Unauthorized request', ErrorCodes.UNAUTHORIZED, 401);
            }

            const { error } = getVideoResponsesSchema.validate({ applicationId: req.candidate.applicationId });
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const videos = await this.videoResponseService.getVideoResponses({
                applicationId: req.candidate.applicationId,
            });

            res.status(200).json({ success: true, data: videos });
        } catch (err) {
            next(err);
        }
    };
}

export default new VideoResponseController();
