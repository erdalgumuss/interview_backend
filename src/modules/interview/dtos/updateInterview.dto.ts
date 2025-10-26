import Joi from 'joi';

/**
 * Mülakat güncelleme için DTO şeması (PATCH/PUT)
 * Tüm alanlar isteğe bağlıdır, ancak mevcutsa validasyon kurallarına uymalıdır.
 */
export const updateInterviewSchema = Joi.object({
    title: Joi.string().optional().min(5).max(100),
    
    // Süre uzatma veya değiştirme için
    expirationDate: Joi.alternatives([
      Joi.date().iso(),
      Joi.number().integer().min(1000000000000) // Timestamp desteği
    ]).optional().messages({
      'date.base': 'Expiration date must be a valid ISO date or timestamp.'
    }),

    personalityTestId: Joi.string().optional().allow(null), // Bağlantıyı kesmek için null kabul et

    // Status güncellemeleri publish veya inactivate rotalarında yapılmalı, ancak genel update'e eklenebilir.
    // Servis katmanında bu geçişler için koruma olduğu için burada optional kalır.
    status: Joi.string()
        .valid('active', 'completed', 'published', 'draft', 'inactive')
        .optional(),

    questions: Joi.array().items(
        Joi.object({
            // Soru alt dokümanı güncellendiği için içindeki alanlar required kalabilir,
            // ancak array'in kendisi optional olmalıdır.
            questionText: Joi.string().required(),
            expectedAnswer: Joi.string().required(),
            explanation: Joi.string().optional(),
            keywords: Joi.array().items(Joi.string()).required(),
            order: Joi.number().required(),
            duration: Joi.number().required(),
            aiMetadata: Joi.object({
                complexityLevel: Joi.string().valid('low', 'medium', 'high').required(),
                requiredSkills: Joi.array().items(Joi.string()).required(),
            }).required(),
        })
    ).optional(), // Array'in kendisi optional
}).min(1); // En az bir alanın gönderilmesi zorunludur.

/**
 * DTO Tipi (TypeScript için)
 */
export interface UpdateInterviewDTO {
    title?: string;
    expirationDate?: Date;
    personalityTestId?: string | null; // null desteği eklendi
    status?: 'active' | 'completed' | 'published' | 'draft' | 'inactive';
    questions?: {
        questionText: string;
        expectedAnswer: string;
        explanation?: string;
        keywords: string[];
        order: number;
        duration: number;
        aiMetadata: {
            complexityLevel: 'low' | 'medium' | 'high';
            requiredSkills: string[];
        };
    }[];
}
