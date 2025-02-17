import PersonalityTestResponseModel, { IPersonalityTestResponse } from '../models/personalityTestResponse.model';
import { SubmitPersonalityTestResponseDTO, GetPersonalityTestResultDTO } from '../dtos/personalityTestResponse.dto';
import { Types } from 'mongoose';

export class PersonalityTestResponseRepository {
    /**
     * ✅ Adayın kişilik testi cevaplarını kaydet
     */
    public async savePersonalityTestResponse(data: SubmitPersonalityTestResponseDTO): Promise<IPersonalityTestResponse> {
        return PersonalityTestResponseModel.create({
            ...data,
            applicationId: new Types.ObjectId(data.applicationId),
            testId: new Types.ObjectId(data.testId),
        });
    }

    /**
     * ✅ Adayın kişilik testi sonuçlarını getir
     */
    public async getPersonalityTestResult(data: GetPersonalityTestResultDTO): Promise<IPersonalityTestResponse | null> {
        return PersonalityTestResponseModel.findOne({
            applicationId: new Types.ObjectId(data.applicationId),
            testId: new Types.ObjectId(data.testId),
        }).exec();
    }

    /**
     * ✅ Adayın test sonuçlarını güncelle
     */
    public async updatePersonalityTestResult(applicationId: string, testId: string, updates: Partial<IPersonalityTestResponse>): Promise<IPersonalityTestResponse | null> {
        return PersonalityTestResponseModel.findOneAndUpdate(
            { 
                applicationId: new Types.ObjectId(applicationId), 
                testId: new Types.ObjectId(testId) 
            },
            updates,
            { new: true }
        ).exec();
    }
}
