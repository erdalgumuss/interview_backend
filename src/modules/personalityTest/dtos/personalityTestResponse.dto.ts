import Joi from 'joi';

/**
 * ✅ Adayın kişilik testi cevaplarını gönderme DTO
 */
export const submitPersonalityTestResponseSchema = Joi.object({
    applicationId: Joi.string().required(),
    testId: Joi.string().required(),
    responses: Joi.array()
        .items(
            Joi.object({
                questionId: Joi.string().required(),
                answer: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            })
        )
        .min(1)
        .required(),
});

/**
 * DTO Interface (TypeScript)
 */
export interface SubmitPersonalityTestResponseDTO {
    applicationId: string;
    testId: string;
    responses: {
        questionId: string;
        answer: string | number;
    }[];
}

/**
 * ✅ Adayın kişilik testi sonucunu alma DTO
 */
export const getPersonalityTestResultSchema = Joi.object({
    applicationId: Joi.string().required(),
    testId: Joi.string().required(),
});

/**
 * DTO Interface (TypeScript)
 */
export interface GetPersonalityTestResultDTO {
    applicationId: string;
    testId: string;
}
