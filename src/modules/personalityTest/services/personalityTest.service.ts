import PersonalityTestModel, { IPersonalityTest } from '../models/personalityTest.model';
import { CreatePersonalityTestDTO, UpdatePersonalityTestDTO } from '../dtos/personalityTest.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';

export class PersonalityTestService {
    
    /**
     * ✅ Yeni bir kişilik testi oluşturur.
     */
    public async createPersonalityTest(data: CreatePersonalityTestDTO): Promise<IPersonalityTest> {
        const newTest = await PersonalityTestModel.create({
            testName: data.testName,
            description: data.description,
            questions: data.questions,
        });

        return newTest;
    }

    /**
     * ✅ Tüm kişilik testlerini getirir.
     */
    public async getAllPersonalityTests(): Promise<IPersonalityTest[]> {
        return PersonalityTestModel.find();
    }

    /**
     * ✅ Belirli bir testi ID ile getirir.
     */
    public async getPersonalityTestById(testId: string): Promise<IPersonalityTest | null> {
        const test = await PersonalityTestModel.findById(testId);
        if (!test) {
            throw new AppError('Personality test not found', ErrorCodes.NOT_FOUND, 404);
        }
        return test;
    }

    /**
     * ✅ Kişilik testini günceller.
     */
    public async updatePersonalityTest(testId: string, data: UpdatePersonalityTestDTO): Promise<IPersonalityTest | null> {
        const updatedTest = await PersonalityTestModel.findByIdAndUpdate(
            testId,
            { testName: data.testName, description: data.description, questions: data.questions },
            { new: true }
        );

        if (!updatedTest) {
            throw new AppError('Personality test not found or could not be updated', ErrorCodes.NOT_FOUND, 404);
        }

        return updatedTest;
    }

    /**
     * ✅ Kişilik testini siler.
     */
    public async deletePersonalityTest(testId: string): Promise<void> {
        const deletedTest = await PersonalityTestModel.findByIdAndDelete(testId);
        if (!deletedTest) {
            throw new AppError('Personality test not found', ErrorCodes.NOT_FOUND, 404);
        }
    }
}
