import Joi from 'joi';

export const updateCandidateSchema = Joi.object({
  applicationId: Joi.string().required(),
  education: Joi.array().items(
    Joi.object({
      school: Joi.string().required(),
      degree: Joi.string().required(),
      graduationYear: Joi.number().min(1950).max(new Date().getFullYear()),
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
  applicationId: string;
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
