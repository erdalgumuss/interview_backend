// src/modules/personalityTest/models/personalityTest.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * -----------------------------
 *  Soru Tipleri Enum
 * -----------------------------
 */
type QuestionType = 'multiple_choice' | 'rating' | 'open_text';

/**
 * -----------------------------
 *  ITestQuestion Interface
 * -----------------------------
 */
export interface ITestQuestion {
    _id?: mongoose.Types.ObjectId;
    questionText: string;
    questionType: QuestionType; // Soru tipi: Çoktan seçmeli, Derecelendirme, Açık uçlu
    choices?: string[]; // Eğer çoktan seçmeli ise kullanılacak seçenekler
    ratingScale?: number; // Eğer rating ise, kaç üzerinden olduğu (default 5)

    /**
     * AI Analizi için kişilik özellikleri üzerindeki etkiler.
     */
    personalityTraitsImpact?: {
        openness?: number;
        conscientiousness?: number;
        extraversion?: number;
        agreeableness?: number;
        neuroticism?: number;
    };
}

/**
 * -----------------------------
 *  IPersonalityTest Interface
 * -----------------------------
 */
export interface IPersonalityTest extends Document {
    testName: string; // Örn: 'Big Five', 'MBTI'
    description?: string;
    questions: ITestQuestion[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * -----------------------------
 *  Test Soru Şeması
 * -----------------------------
 */
const TestQuestionSchema = new Schema<ITestQuestion>(
    {
        questionText: { type: String, required: true },
        questionType: { type: String, enum: ['multiple_choice', 'rating', 'open_text'], required: true },
        choices: [{ type: String }], // Çoktan seçmeli seçenekler
        ratingScale: { type: Number, default: 5 }, // Derecelendirme için

        personalityTraitsImpact: {
            openness: { type: Number, default: 0 },
            conscientiousness: { type: Number, default: 0 },
            extraversion: { type: Number, default: 0 },
            agreeableness: { type: Number, default: 0 },
            neuroticism: { type: Number, default: 0 },
        },
    },
    {
        _id: false, // Alt doküman olduğu için ayrı bir _id istemiyoruz.
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
        timestamps: true,
    }
);

/**
 * -----------------------------
 *  Model Oluşturma
 * -----------------------------
 */
export default mongoose.model<IPersonalityTest>('PersonalityTest', PersonalityTestSchema);
