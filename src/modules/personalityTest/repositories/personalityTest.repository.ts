import PersonalityTestModel, { IPersonalityTest } from '../models/personalityTest.model';
import { CreatePersonalityTestDTO, UpdatePersonalityTestDTO } from '../dtos/personalityTest.dto';
import { Types } from 'mongoose';

export class PersonalityTestRepository {
    /**
     * ✅ Yeni bir kişilik testi oluştur
     */
    public async createPersonalityTest(data: CreatePersonalityTestDTO): Promise<IPersonalityTest> {
        return PersonalityTestModel.create(data);
    }

    /**
     * ✅ Test ID ile kişilik testi getir
     */
    public async getPersonalityTestById(testId: string): Promise<IPersonalityTest | null> {
        return PersonalityTestModel.findById(testId).exec();
    }

    /**
     * ✅ Tüm kişilik testlerini getir
     */
    public async getAllPersonalityTests(): Promise<IPersonalityTest[]> {
        return PersonalityTestModel.find().exec();
    }

    /**
     * ✅ Testi güncelle
     */
    public async updatePersonalityTest(data: UpdatePersonalityTestDTO): Promise<IPersonalityTest | null> {
        const { testId, ...updateFields } = data;
        return PersonalityTestModel.findByIdAndUpdate(
            testId,
            updateFields,
            { new: true }
        ).exec();
    }

    /**
     * ✅ Testi kalıcı olarak sil
     */
    public async deletePersonalityTest(testId: string): Promise<IPersonalityTest | null> {
        return PersonalityTestModel.findByIdAndDelete(testId).exec();
    }
}
