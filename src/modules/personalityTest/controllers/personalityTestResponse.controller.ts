import { Request, Response, NextFunction } from 'express';
import { PersonalityTestResponseService } from '../services/personalityTestResponse.service';
import { submitPersonalityTestResponseSchema, getPersonalityTestResultSchema, GetPersonalityTestResultDTO } from '../dtos/personalityTestResponse.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

class PersonalityTestResponseController {
    private personalityTestResponseService: PersonalityTestResponseService;

    constructor() {
        this.personalityTestResponseService = new PersonalityTestResponseService();
    }

    /**
     * ✅ Adayın kişilik testi cevaplarını kaydeder.
     */
    public submitPersonalityTestResponse = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error } = submitPersonalityTestResponseSchema.validate(req.body);
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const testResponse = await this.personalityTestResponseService.submitPersonalityTestResponse(req.body);
            res.status(201).json({ success: true, data: testResponse });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Adayın kişilik testi sonucunu getirir.
     */
    public getPersonalityTestResult = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error } = getPersonalityTestResultSchema.validate(req.query);
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const testResponse = await this.personalityTestResponseService.getPersonalityTestResult(req.query as unknown as GetPersonalityTestResultDTO);
            res.status(200).json({ success: true, data: testResponse });
        } catch (err) {
            next(err);
        }
    };
}

export default new PersonalityTestResponseController();
