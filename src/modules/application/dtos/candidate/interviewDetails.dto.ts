// src/modules/application/dtos/interviewDetails.dto.ts
import { InterviewStatus } from '../../interview/models/interview.model';

export class InterviewDetailsDTO {
  id: string;
  title: string;
  expirationDate: Date;
  status: InterviewStatus;
  createdBy: {
    name: string;
    company: string;
  };
  stages: {
    personalityTest: boolean;
    questionnaire: boolean;
  };
  candidateInstructions?: {
    preparationTips?: string;
    technicalRequirements?: string;
    allowedDevices?: string[];
  };

  constructor(data: any) {
    this.id = data._id.toString();
    this.title = data.title;
    this.expirationDate = data.expirationDate;
    this.status = data.status;
    this.createdBy = {
      name: data.createdBy.userId?.name || '',
      company: data.createdBy.userId?.company || ''
    };
    this.stages = data.stages;
    this.candidateInstructions = data.candidateInstructions;
  }
}