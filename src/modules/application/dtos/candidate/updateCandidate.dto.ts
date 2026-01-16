import Joi from 'joi';

// Dinamik olarak mezuniyet yılı max değeri belirleniyor
// Gelecek 6 yıla kadar izin ver (henüz mezun olmamış öğrenciler için)
const maxGraduationYear = new Date().getFullYear() + 6;

// Body validation için schema (applicationId middleware'den geliyor)
export const updateCandidateSchema = Joi.object({
  education: Joi.array().items(
    Joi.object({
      school: Joi.string().required(),
      degree: Joi.string().required(),
      graduationYear: Joi.number().min(1950).max(maxGraduationYear),
    })
  ).optional(),
  experience: Joi.array().items(
    Joi.object({
      company: Joi.string().required(),
      position: Joi.string().required(),
      duration: Joi.string().required(),
      responsibilities: Joi.string().optional(),
    })
  ).optional(),
  skills: Joi.object({
    technical: Joi.array().items(Joi.string()).optional(),
    personal: Joi.array().items(Joi.string()).optional(),
    languages: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  
});

export interface UpdateCandidateDTO {
  applicationId: string; // Controller tarafından middleware'den ekleniyor
  education?: {
    school: string;
    degree: string;
    graduationYear: number;
  }[];
  experience?: {
    company: string;
    position: string;
    duration: string;
    responsibilities?: string;
  }[];
  skills?: {
    technical?: string[];
    personal?: string[];
    languages?: string[];
  };
}
