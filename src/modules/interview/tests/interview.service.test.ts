// src/modules/interview/tests/interview.service.test.ts

import { InterviewService } from '../services/interview.service';
import { InterviewRepository } from '../repositories/interview.repository';
import { IInterview, InterviewStatus } from '../models/interview.model';
import { CreateInterviewDTO } from '../dtos/createInterview.dto';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';

// Mock Repository
jest.mock('../repositories/interview.repository');

describe('InterviewService - Unit Tests', () => {
  let interviewService: InterviewService;
  let mockRepository: jest.Mocked<InterviewRepository>;

  beforeEach(() => {
    // Repository mock'ını temizle ve yeniden oluştur
    jest.clearAllMocks();
    mockRepository = new InterviewRepository() as jest.Mocked<InterviewRepository>;
    interviewService = new InterviewService();
    (interviewService as any).interviewRepository = mockRepository;
  });

  describe('createInterview', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const validInterviewData: CreateInterviewDTO = {
      title: 'Senior Backend Developer Interview',
      description: 'Technical interview for senior position',
      expirationDate: new Date('2026-12-31'),
      position: {
        title: 'Senior Backend Developer',
        department: 'Engineering',
        competencyWeights: {
          technical: 70,
          communication: 20,
          problem_solving: 10
        }
      },
      stages: {
        personalityTest: true,
        questionnaire: true
      },
      questions: [
        {
          questionText: 'Explain RESTful API principles',
          expectedAnswer: 'REST principles include stateless communication...',
          explanation: 'This tests API knowledge',
          keywords: ['REST', 'API', 'HTTP'],
          order: 1,
          duration: 300,
          aiMetadata: {
            complexityLevel: 'medium',
            requiredSkills: ['Backend', 'API Design']
          }
        }
      ]
    };

    it('should create interview successfully with valid data', async () => {
      const mockCreatedInterview = {
        _id: new mongoose.Types.ObjectId(),
        ...validInterviewData,
        createdBy: { userId: new mongoose.Types.ObjectId(userId) },
        status: InterviewStatus.DRAFT,
        interviewLink: {
          link: 'http://localhost:3000/application/test-id',
          expirationDate: validInterviewData.expirationDate
        }
      } as unknown as IInterview;

      mockRepository.generateInterviewLink.mockResolvedValue('http://localhost:3000/application/test-id');
      mockRepository.createInterview.mockResolvedValue(mockCreatedInterview);

      const result = await interviewService.createInterview(validInterviewData, userId);

      expect(result).toBeDefined();
      expect(result.title).toBe(validInterviewData.title);
      expect(result.status).toBe(InterviewStatus.DRAFT);
      expect(mockRepository.createInterview).toHaveBeenCalledTimes(1);
    });

    it('should throw error when questions array is empty', async () => {
      const invalidData: CreateInterviewDTO = {
        ...validInterviewData,
        questions: []
      };

      await expect(
        interviewService.createInterview(invalidData, userId)
      ).rejects.toThrow(AppError);

      await expect(
        interviewService.createInterview(invalidData, userId)
      ).rejects.toMatchObject({
        message: 'Interview must contain at least one question.',
        code: ErrorCodes.BAD_REQUEST,
        statusCode: 400
      });
    });

    it('should throw error when questions are undefined', async () => {
      const invalidData = {
        ...validInterviewData,
        questions: undefined as any
      };

      await expect(
        interviewService.createInterview(invalidData, userId)
      ).rejects.toThrow('Interview must contain at least one question.');
    });

    it('should throw error with invalid expiration date', async () => {
      const invalidData: CreateInterviewDTO = {
        ...validInterviewData,
        expirationDate: new Date('invalid-date')
      };

      await expect(
        interviewService.createInterview(invalidData, userId)
      ).rejects.toThrow('Invalid expiration date format');
    });

    it('should create interview with default AI settings', async () => {
      const dataWithoutAI: CreateInterviewDTO = {
        ...validInterviewData,
        aiAnalysisSettings: undefined
      };

      const mockCreatedInterview = {
        _id: new mongoose.Types.ObjectId(),
        ...dataWithoutAI,
        aiAnalysisSettings: {
          useAutomaticScoring: true,
          gestureAnalysis: true,
          speechAnalysis: true,
          eyeContactAnalysis: false,
          tonalAnalysis: false,
          keywordMatchScore: 0
        }
      } as unknown as IInterview;

      mockRepository.generateInterviewLink.mockResolvedValue('http://localhost:3000/application/test');
      mockRepository.createInterview.mockResolvedValue(mockCreatedInterview);

      const result = await interviewService.createInterview(dataWithoutAI, userId);

      expect(result.aiAnalysisSettings).toBeDefined();
    });
  });

  describe('getInterviewById', () => {
    it('should return interview when found', async () => {
      const mockInterview = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Interview',
        status: InterviewStatus.DRAFT
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(mockInterview);

      const result = await interviewService.getInterviewById(mockInterview._id.toString());

      expect(result).toEqual(mockInterview);
      expect(mockRepository.getInterviewById).toHaveBeenCalledWith(mockInterview._id.toString());
    });

    it('should return null when interview not found', async () => {
      mockRepository.getInterviewById.mockResolvedValue(null);

      const result = await interviewService.getInterviewById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const existingInterview = {
      _id: new mongoose.Types.ObjectId(interviewId),
      title: 'Original Title',
      status: InterviewStatus.DRAFT,
      questions: [{ questionText: 'Q1' }]
    } as IInterview;

    it('should update interview successfully in DRAFT status', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedInterview = { ...existingInterview, ...updateData } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(existingInterview);
      mockRepository.updateInterviewById.mockResolvedValue(updatedInterview);

      const result = await interviewService.updateInterview(interviewId, updateData);

      expect(result?.title).toBe('Updated Title');
      expect(mockRepository.updateInterviewById).toHaveBeenCalledWith(interviewId, updateData);
    });

    it('should throw error when updating non-existent interview', async () => {
      mockRepository.getInterviewById.mockResolvedValue(null);

      await expect(
        interviewService.updateInterview('nonexistent-id', { title: 'New' })
      ).rejects.toThrow('Interview not found.');
    });

    it('should throw error when updating core fields of PUBLISHED interview', async () => {
      const publishedInterview = {
        ...existingInterview,
        status: InterviewStatus.PUBLISHED
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(publishedInterview);

      await expect(
        interviewService.updateInterview(interviewId, { title: 'New Title' })
      ).rejects.toThrow('Cannot modify core fields');
    });

    it('should throw error when setting empty questions array', async () => {
      mockRepository.getInterviewById.mockResolvedValue(existingInterview);

      await expect(
        interviewService.updateInterview(interviewId, { questions: [] })
      ).rejects.toThrow('Interview must contain at least one question.');
    });

    it('should allow status update on PUBLISHED interview', async () => {
      const publishedInterview = {
        ...existingInterview,
        status: InterviewStatus.PUBLISHED
      } as IInterview;

      const updateData = { status: InterviewStatus.INACTIVE };
      const updatedInterview = { ...publishedInterview, ...updateData } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(publishedInterview);
      mockRepository.updateInterviewById.mockResolvedValue(updatedInterview);

      const result = await interviewService.updateInterview(interviewId, updateData);

      expect(result?.status).toBe(InterviewStatus.INACTIVE);
    });
  });

  describe('publishInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();

    it('should publish DRAFT interview successfully', async () => {
      const draftInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        title: 'Test Interview',
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1' }],
        expirationDate: new Date('2026-12-31')
      } as IInterview;

      const publishedInterview = {
        ...draftInterview,
        status: InterviewStatus.PUBLISHED,
        interviewLink: {
          link: 'http://localhost:3000/application/' + interviewId,
          expirationDate: draftInterview.expirationDate
        }
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(draftInterview);
      mockRepository.updateInterviewById.mockResolvedValue(publishedInterview);

      const result = await interviewService.publishInterview(interviewId);

      expect(result?.status).toBe(InterviewStatus.PUBLISHED);
      expect(result?.interviewLink?.link).toContain(interviewId);
    });

    it('should throw error when publishing non-DRAFT interview', async () => {
      const publishedInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        status: InterviewStatus.PUBLISHED,
        questions: [{ questionText: 'Q1' }]
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(publishedInterview);

      await expect(
        interviewService.publishInterview(interviewId)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Cannot publish an interview with status'),
        statusCode: 409
      });
    });

    it('should throw error when publishing interview without questions', async () => {
      const emptyInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        status: InterviewStatus.DRAFT,
        questions: []
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(emptyInterview);

      await expect(
        interviewService.publishInterview(interviewId)
      ).rejects.toThrow('Interview must have questions before publishing.');
    });

    it('should throw error when publishing expired interview', async () => {
      const expiredInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1' }],
        expirationDate: new Date('2020-01-01') // Past date
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(expiredInterview);

      await expect(
        interviewService.publishInterview(interviewId)
      ).rejects.toMatchObject({
        message: 'Cannot publish an interview that has already expired.',
        statusCode: 403
      });
    });

    it('should throw error when interview not found', async () => {
      mockRepository.getInterviewById.mockResolvedValue(null);

      await expect(
        interviewService.publishInterview('nonexistent-id')
      ).rejects.toThrow('Interview not found.');
    });
  });

  describe('deleteInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();

    it('should soft delete interview successfully', async () => {
      const mockInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        title: 'Test Interview'
      } as IInterview;

      mockRepository.getInterviewById.mockResolvedValue(mockInterview);
      mockRepository.softDeleteInterviewById.mockResolvedValue(mockInterview);

      await interviewService.deleteInterview(interviewId);

      expect(mockRepository.softDeleteInterviewById).toHaveBeenCalledWith(interviewId);
    });

    it('should throw error when deleting non-existent interview', async () => {
      mockRepository.getInterviewById.mockResolvedValue(null);

      await expect(
        interviewService.deleteInterview('nonexistent-id')
      ).rejects.toThrow('Interview not found.');
    });
  });

  describe('getInterviewsByUser', () => {
    const userId = new mongoose.Types.ObjectId().toString();

    it('should return all interviews for user', async () => {
      const mockInterviews = [
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 2' }
      ] as IInterview[];

      mockRepository.getInterviewsByUser.mockResolvedValue(mockInterviews);

      const result = await interviewService.getInterviewsByUser(userId);

      expect(result).toHaveLength(2);
      expect(mockRepository.getInterviewsByUser).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when user has no interviews', async () => {
      mockRepository.getInterviewsByUser.mockResolvedValue([]);

      const result = await interviewService.getInterviewsByUser(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllInterviews', () => {
    it('should return all interviews', async () => {
      const mockInterviews = [
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 2' },
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 3' }
      ] as IInterview[];

      mockRepository.getAllInterviews.mockResolvedValue(mockInterviews);

      const result = await interviewService.getAllInterviews();

      expect(result).toHaveLength(3);
      expect(mockRepository.getAllInterviews).toHaveBeenCalledTimes(1);
    });
  });
});
