import { Request, Response, NextFunction } from 'express';
import { PersonalityTestService } from '../services/personalityTest.service';
import { createPersonalityTestSchema, updatePersonalityTestSchema } from '../dtos/personalityTest.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

class PersonalityTestController {
    private personalityTestService: PersonalityTestService;

    constructor() {
        this.personalityTestService = new PersonalityTestService();
    }

    /**
     * ✅ Yeni kişilik testi oluşturma
     */
    public createPersonalityTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error } = createPersonalityTestSchema.validate(req.body);
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const newTest = await this.personalityTestService.createPersonalityTest(req.body);
            res.status(201).json({ success: true, data: newTest });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Tüm kişilik testlerini getir
     */
    public getAllPersonalityTests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tests = await this.personalityTestService.getAllPersonalityTests();
            res.json({ success: true, data: tests });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Belirli bir kişilik testini getir
     */
    public getPersonalityTestById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            const test = await this.personalityTestService.getPersonalityTestById(testId);
            res.json({ success: true, data: test });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Kişilik testini güncelle
     */
    public updatePersonalityTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            const { error } = updatePersonalityTestSchema.validate(req.body);
            if (error) {
                throw new AppError(error.message, ErrorCodes.BAD_REQUEST, 400);
            }

            const updatedTest = await this.personalityTestService.updatePersonalityTest(testId, req.body);
            res.json({ success: true, data: updatedTest });
        } catch (err) {
            next(err);
        }
    };

    /**
     * ✅ Kişilik testini sil
     */
    public deletePersonalityTest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { testId } = req.params;
            await this.personalityTestService.deletePersonalityTest(testId);
            res.status(200).json({ success: true, message: 'Personality test deleted successfully' });
        } catch (err) {
            next(err);
        }
    };
}

export default new PersonalityTestController();
