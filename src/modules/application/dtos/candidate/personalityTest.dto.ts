// src/modules/application/dtos/personalityTest.dto.ts
import Joi from 'joi';

export class PersonalityTestResponseDTO {
  testId: string;
  answers: Record<string, number>;

  constructor(data: { testId: string; answers: Record<string, number> }) {
    this.testId = data.testId;
    this.answers = data.answers;
  }
}

export const personalityTestSchema = Joi.object({
  testId: Joi.string().required(),
  answers: Joi.object().pattern(
    Joi.string(),
    Joi.number().min(1).max(5)
  ).required()
});