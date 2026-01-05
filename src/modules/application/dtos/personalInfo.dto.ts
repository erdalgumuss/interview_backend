// src/modules/application/dtos/personalInfo.dto.ts
import Joi from 'joi';

export interface EducationDTO {
  school?: string;
  degree?: string;
  graduationYear?: number;
}

export interface ExperienceDTO {
  company?: string;
  position?: string;
  duration?: string;
  responsibilities?: string;
}

export interface SkillsDTO {
  technical?: string[];
  personal?: string[];
  languages?: string[];
}

export class PersonalInfoDTO {
  name: string;
  surname: string;
  email: string;
  education?: EducationDTO[];
  experience?: ExperienceDTO[];
  skills?: SkillsDTO;

  constructor(data: {
    name: string;
    surname: string;
    email: string;
    education?: EducationDTO[];
    experience?: ExperienceDTO[];
    skills?: SkillsDTO;
  }) {
    this.name = data.name;
    this.surname = data.surname;
    this.email = data.email;
    this.education = data.education;
    this.experience = data.experience;
    this.skills = data.skills;
  }
}

export const personalInfoSchema = Joi.object({
  // Bu alanlar artık zorunlu değil çünkü ilk adımda alındı
  name: Joi.string().optional(),
  surname: Joi.string().optional(),
  email: Joi.string().email().optional(),
  
  // Detaylar zorunlu veya opsiyonel olabilir (Senaryoya göre)
  education: Joi.array().items(/*...*/).optional(),
  experience: Joi.array().items(/*...*/).optional(),
  skills: Joi.object({
    technical: Joi.array().items(Joi.string()),
    personal: Joi.array().items(Joi.string()),
    languages: Joi.array().items(Joi.string())
  }).optional()
});