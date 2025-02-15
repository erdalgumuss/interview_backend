// src/modules/personalityTest/models/personalityTest.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  ITestQuestion Interface
 * -----------------------------
 * Kişilik testi içerisindeki tek bir soruya ait temel yapı.
 */
export interface ITestQuestion {
    _id?: mongoose.Types.ObjectId; // Sorulara otomatik ID vermek istersen opsiyonel tutabilirsin
    questionText: string;
    // İhtiyaca göre farklı soru tipleri (Seçmeli, derecelendirme vb.) eklenebilir
    // choiceOptions?: string[];
}

/**
 * -----------------------------
 *  IPersonalityTest Interface
 * -----------------------------
 * Ana kişilik testi dokümanı.
 */
export interface IPersonalityTest extends Document {
    testName: string; // Ör: 'BigFive', 'DISC', 'MBTI' vb.
    description?: string;
    questions: ITestQuestion[];
    createdAt?: Date; // timestamps: true sayesinde otomatik, bu yüzden opsiyonel
    updatedAt?: Date; // timestamps: true sayesinde otomatik, bu yüzden opsiyonel
}

/**
 * -----------------------------
 *  Soru Alt Şeması
 * -----------------------------
 */
const TestQuestionSchema = new Schema<ITestQuestion>(
    {
        questionText: { type: String, required: true },
        // choiceOptions: [{ type: String }] // Çoktan seçmeli sorular için örnek
    },
    {
        _id: false, // Her soruya otomatik _id üretmek istemiyorsan 'false' ayarı kullanabilirsin
    }
);

/**
 * -----------------------------
 *  Kişilik Testi Şeması
 * -----------------------------
 */
const PersonalityTestSchema = new Schema<IPersonalityTest>(
    {
        testName: { type: String, required: true },
        description: { type: String },
        questions: [TestQuestionSchema],
    },
    {
        timestamps: true, // createdAt & updatedAt otomatik olarak eklenir
    }
);

/**
 * -----------------------------
 *  Model Oluşturma
 * -----------------------------
 */
export default mongoose.model<IPersonalityTest>(
    'PersonalityTest',
    PersonalityTestSchema
);
