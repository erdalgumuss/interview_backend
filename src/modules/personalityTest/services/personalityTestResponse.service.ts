import PersonalityTestResponseModel, { IPersonalityTestResponse } from '../models/personalityTestResponse.model';
import ApplicationModel from '../../application/models/application.model';
import { SubmitPersonalityTestResponseDTO, GetPersonalityTestResultDTO } from '../dtos/personalityTestResponse.dto';
import { AppError } from '../../../middlewares/error/appError';
import { ErrorCodes } from '../../../constants/errors';
import { Types } from 'mongoose';

export class PersonalityTestResponseService {
    
    /**
     * ✅ Adayın kişilik testi cevaplarını kaydeder.
     */
    public async submitPersonalityTestResponse(data: SubmitPersonalityTestResponseDTO): Promise<IPersonalityTestResponse> {
        const { applicationId, testId, responses } = data;

        // String olan ID'leri ObjectId formatına çeviriyoruz
        const appId = new Types.ObjectId(applicationId);
        const testObjId = new Types.ObjectId(testId);

        // Başvuru kontrolü
        const application = await ApplicationModel.findById(appId);
        if (!application) {
            throw new AppError('Application not found', ErrorCodes.NOT_FOUND, 404);
        }

        // Daha önce test yanıtlanmış mı kontrol et
        const existingResponse = await PersonalityTestResponseModel.findOne({ applicationId: appId, testId: testObjId });
        if (existingResponse) {
            throw new AppError('Personality test already submitted', ErrorCodes.BAD_REQUEST, 400);
        }

        // Yeni test cevabını oluştur
        const testResponse = await PersonalityTestResponseModel.create({
            applicationId: appId,
            testId: testObjId,
            responses,
            completed: true, // ✅ Test tamamlandı olarak işaretlenir
        });

        // Başvuru durumunu güncelle (Test tamamlandı)
        application.personalityTestResults = {
            testId: testObjId,
            completed: true,
        };

        await application.save();

        return testResponse;
    }

    /**
     * ✅ Adayın kişilik testi sonucunu getirir.
     */
    public async getPersonalityTestResult(data: GetPersonalityTestResultDTO): Promise<IPersonalityTestResponse | null> {
        const { applicationId, testId } = data;

        // ObjectId dönüşümü
        const appId = new Types.ObjectId(applicationId);
        const testObjId = new Types.ObjectId(testId);

        const testResponse = await PersonalityTestResponseModel.findOne({ applicationId: appId, testId: testObjId });
        if (!testResponse) {
            throw new AppError('Personality test response not found', ErrorCodes.NOT_FOUND, 404);
        }

        return testResponse;
    }
}
