import Joi from 'joi';

export const updateCandidateSchema = Joi.object({
  applicationId: Joi.string().required(),
  education: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional().allow(null, ''),
      school: Joi.string().required(),
      degree: Joi.string().required(),
      graduationYear: Joi.alternatives().try(Joi.string(), Joi.number()).required(),    })
  ).optional(),
  experience: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional().allow(null, ''),
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

  documents: Joi.object({
      resume: Joi.string().uri().optional().allow(''),
      certificates: Joi.array().items(Joi.string().uri()).optional(),
      socialMediaLinks: Joi.array().items(Joi.string().uri()).optional(),
  }).optional()
});

export interface UpdateCandidateDTO {
  applicationId: string;
  education?: {
    _id?: string;
    school: string;
    degree: string;
    graduationYear: number;
  }[];
  experience?: {
    _id?: string;
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
   documents?: {
    resume?: string;
    certificates?: string[];
    socialMediaLinks?: string[];
  };
}
