// src/modules/interview/models/interview.model.ts

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Her bir soru için kullanılacak interface
 */
export interface IInterviewQuestion {
    _id?: mongoose.Types.ObjectId; // Alt şemada _id:false yaptığımız için opsiyonel
    questionText: string;
    expectedAnswer: string;
    explanation?: string;
    keywords: string[];
    order: number;
    duration: number;
    aiMetadata: {
        complexityLevel: 'low' | 'medium' | 'high';
        requiredSkills: string[];
        keywordMatchScore?: number;
    };
}

/**
 * Asıl Interview dokümanı için kullanılacak interface
 * timestamps: true kullanıldığı için createdAt & updatedAt opsiyonel tutulabilir.
 */
export interface IInterview extends Document {
    title: string;
    expirationDate: Date;
    createdBy: {
        userId: mongoose.Types.ObjectId;
    };
    status: 'active' | 'completed' | 'published' | 'draft' | 'inactive';
    personalityTestId?: mongoose.Types.ObjectId; // Ref to PersonalityTest
    stages: {
        personalityTest: boolean;
        questionnaire: boolean;
    };
    interviewLink: {
        link: string;
        expirationDate?: Date;
    };
    questions: IInterviewQuestion[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * InterviewQuestion alt şeması
 */
const InterviewQuestionSchema = new Schema<IInterviewQuestion>(
    {
        questionText: { type: String, required: true },
        expectedAnswer: { type: String, required: true },
        explanation: { type: String },
        keywords: { type: [String], required: true },
        order: { type: Number, required: true },
        duration: { type: Number, required: true },
        aiMetadata: {
            complexityLevel: {
                type: String,
                enum: ['low', 'medium', 'high'],
                required: true,
            },
            requiredSkills: { type: [String], required: true },
            keywordMatchScore: { type: Number, default: 0 },
        },
    },
    {
        _id: false, // Alt doküman olduğu için ayrı bir _id oluşturulmasını istemeyebilirsiniz.
    }
);

/**
 * Asıl Interview şeması
 */
const InterviewSchema = new Schema<IInterview>(
    {
        title: { type: String, required: true },
        expirationDate: { type: Date, required: true },
        createdBy: {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'published', 'draft', 'inactive'],
        },
        personalityTestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PersonalityTest',
        },
        stages: {
            personalityTest: { type: Boolean, default: false },
            questionnaire: { type: Boolean, default: true },
        },
        interviewLink: {
            link: { type: String },
            expirationDate: { type: Date },
        },
        questions: [InterviewQuestionSchema],
    },
    {
        timestamps: true // createdAt & updatedAt otomatik olarak eklenecek
    }
);

export default mongoose.model<IInterview>('Interview', InterviewSchema);
