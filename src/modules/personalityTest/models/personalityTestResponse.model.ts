import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  ITestResponse Interface
 * -----------------------------
 * Adayın kişilik testi içinde her bir soruya verdiği cevapları temsil eder.
 */
export interface ITestResponse {
    questionId: mongoose.Types.ObjectId;
    answer: string | number;
}

/**
 * -----------------------------
 *  IPersonalityTestResponse Interface
 * -----------------------------
 * Kişilik testi tamamlandıktan sonra kaydedilen aday sonuçları.
 */
export interface IPersonalityTestResponse extends Document {
    applicationId: mongoose.Types.ObjectId; // Aday başvurusu ile ilişkilendirilmiş olmalı
    testId: mongoose.Types.ObjectId; // Hangi kişilik testine ait olduğu
    responses: ITestResponse[]; // Adayın her soruya verdiği cevaplar
    completed: boolean; // Test tamamlandı mı?
    scores: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * -----------------------------
 *  Cevap Şeması
 * -----------------------------
 */
const TestResponseSchema = new Schema<ITestResponse>({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PersonalityTest.questions' },
    answer: { type: Schema.Types.Mixed, required: true },
});

/**
 * -----------------------------
 *  Personality Test Response Şeması
 * -----------------------------
 */
const PersonalityTestResponseSchema = new Schema<IPersonalityTestResponse>(
    {
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            required: true,
        },
        testId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PersonalityTest',
            required: true,
        },
        responses: [TestResponseSchema],
        completed: { type: Boolean, default: false },
        scores: {
            openness: { type: Number, required: true, default: 0 },
            conscientiousness: { type: Number, required: true, default: 0 },
            extraversion: { type: Number, required: true, default: 0 },
            agreeableness: { type: Number, required: true, default: 0 },
            neuroticism: { type: Number, required: true, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

/**
 * -----------------------------
 *  Model Oluşturma
 * -----------------------------
 */
export default mongoose.model<IPersonalityTestResponse>('PersonalityTestResponse', PersonalityTestResponseSchema);
