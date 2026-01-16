// src/modules/interview/tests/interview.controller.test.ts

import { Request, Response, NextFunction } from 'express';
import InterviewController from '../controllers/interview.controller';
import { InterviewService } from '../services/interview.service';
import { IInterview, InterviewStatus } from '../models/interview.model';
import { AppError } from '../../../middlewares/errors/appError';
import { ErrorCodes } from '../../../constants/errors';
import mongoose from 'mongoose';

// Mock Service
jest.mock('../services/interview.service');

describe('InterviewController - Unit Tests', () => {
  let mockService: jest.Mocked<InterviewService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    // Service mock'ını oluştur
    mockService = new InterviewService() as jest.Mocked<InterviewService>;
    (InterviewController as any).interviewService = mockService;

    // Request mock
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        role: 'company'
      }
    };

    // Response mock
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Next function mock
    mockNext = jest.fn();
  });

  describe('createInterview', () => {
    it('should create interview successfully', async () => {
      const interviewData = {
        title: 'Backend Developer Interview',
        questions: [{ questionText: 'Test question' }],
        expirationDate: new Date('2026-12-31')
      };

      const mockCreatedInterview = {
        _id: new mongoose.Types.ObjectId(),
        ...interviewData,
        status: InterviewStatus.DRAFT
      } as unknown as IInterview;

      mockRequest.body = interviewData;
      mockService.createInterview.mockResolvedValue(mockCreatedInterview);

      await InterviewController.createInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedInterview
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await InterviewController.createInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User authentication failed',
          statusCode: 401
        })
      );
    });

    it('should pass service errors to next middleware', async () => {
      mockRequest.body = { title: 'Test', questions: [] };
      const error = new AppError('Interview must contain at least one question.', ErrorCodes.BAD_REQUEST, 400);
      
      mockService.createInterview.mockRejectedValue(error);

      await InterviewController.createInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllInterviews', () => {
    it('should return all interviews for admin', async () => {
      mockRequest.user = { id: 'admin-id', role: 'admin' };
      const mockInterviews = [
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Interview 2' }
      ] as IInterview[];

      mockService.getAllInterviews.mockResolvedValue(mockInterviews);

      await InterviewController.getAllInterviews(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInterviews
      });
    });

    it('should throw error when non-admin user tries to access', async () => {
      mockRequest.user = { id: 'user-id', role: 'company' };

      await InterviewController.getAllInterviews(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden: Admin access required',
          statusCode: 403
        })
      );
    });
  });

  describe('getUserInterviews', () => {
    it('should return user interviews', async () => {
      const userId = mockRequest.user!.id;
      const mockInterviews = [
        { _id: new mongoose.Types.ObjectId(), title: 'My Interview' }
      ] as IInterview[];

      mockService.getInterviewsByUser.mockResolvedValue(mockInterviews);

      await InterviewController.getUserInterviews(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.getInterviewsByUser).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInterviews
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await InterviewController.getUserInterviews(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized',
          statusCode: 401
        })
      );
    });
  });

  describe('getInterviewById', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    it('should return interview when user is owner', async () => {
      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: userId, role: 'company' };

      const mockInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        title: 'Test Interview',
        status: InterviewStatus.DRAFT,
        createdBy: { userId: new mongoose.Types.ObjectId(userId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(mockInterview);

      await InterviewController.getInterviewById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInterview
      });
    });

    it('should throw error when interview not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockService.getInterviewById.mockResolvedValue(null);

      await InterviewController.getInterviewById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Interview not found',
          statusCode: 404
        })
      );
    });

    it('should hide DRAFT interview from non-owner', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const otherUserId = new mongoose.Types.ObjectId().toString();

      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: otherUserId, role: 'company' };

      const mockInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        status: InterviewStatus.DRAFT,
        createdBy: { userId: new mongoose.Types.ObjectId(ownerId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(mockInterview);

      await InterviewController.getInterviewById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Interview not found',
          statusCode: 404
        })
      );
    });
  });

  describe('updateInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    it('should update interview when user is owner', async () => {
      mockRequest.params = { id: interviewId };
      mockRequest.body = { title: 'Updated Title' };
      mockRequest.user = { id: userId, role: 'company' };

      const existingInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        title: 'Original Title',
        createdBy: { userId: new mongoose.Types.ObjectId(userId) }
      } as IInterview;

      const updatedInterview = {
        ...existingInterview,
        title: 'Updated Title'
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(existingInterview);
      mockService.updateInterview.mockResolvedValue(updatedInterview);

      await InterviewController.updateInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedInterview
      });
    });

    it('should throw error when non-owner tries to update', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const otherUserId = new mongoose.Types.ObjectId().toString();

      mockRequest.params = { id: interviewId };
      mockRequest.body = { title: 'New Title' };
      mockRequest.user = { id: otherUserId, role: 'company' };

      const existingInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        createdBy: { userId: new mongoose.Types.ObjectId(ownerId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(existingInterview);

      await InterviewController.updateInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden: Cannot update other user interviews',
          statusCode: 403
        })
      );
    });
  });

  describe('publishInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    it('should publish interview successfully', async () => {
      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: userId, role: 'company' };

      const draftInterview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        status: InterviewStatus.DRAFT,
        createdBy: { userId: new mongoose.Types.ObjectId(userId) },
        questions: [{ questionText: 'Q1' }]
      } as IInterview;

      const publishedInterview = {
        ...draftInterview,
        status: InterviewStatus.PUBLISHED
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(draftInterview);
      mockService.publishInterview.mockResolvedValue(publishedInterview);

      await InterviewController.publishInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: publishedInterview
      });
    });

    it('should throw error when non-owner tries to publish', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const otherUserId = new mongoose.Types.ObjectId().toString();

      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: otherUserId, role: 'company' };

      const interview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        createdBy: { userId: new mongoose.Types.ObjectId(ownerId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(interview);

      await InterviewController.publishInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden: Cannot publish other user interviews',
          statusCode: 403
        })
      );
    });
  });

  describe('deleteInterview', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    it('should delete interview successfully', async () => {
      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: userId, role: 'company' };

      const interview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        createdBy: { userId: new mongoose.Types.ObjectId(userId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(interview);
      mockService.deleteInterview.mockResolvedValue();

      await InterviewController.deleteInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Interview deleted successfully'
      });
    });

    it('should throw error when non-owner tries to delete', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const otherUserId = new mongoose.Types.ObjectId().toString();

      mockRequest.params = { id: interviewId };
      mockRequest.user = { id: otherUserId, role: 'company' };

      const interview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        createdBy: { userId: new mongoose.Types.ObjectId(ownerId) }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(interview);

      await InterviewController.deleteInterview(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden: Cannot delete other user interviews',
          statusCode: 403
        })
      );
    });
  });

  describe('generateInterviewLink', () => {
    const interviewId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    it('should update interview link expiration date', async () => {
      mockRequest.params = { id: interviewId };
      mockRequest.body = { expirationDate: '2027-12-31' };
      mockRequest.user = { id: userId, role: 'company' };

      const interview = {
        _id: new mongoose.Types.ObjectId(interviewId),
        createdBy: { userId: new mongoose.Types.ObjectId(userId) },
        interviewLink: {
          link: 'http://localhost:3000/application/test-id',
          expirationDate: new Date('2026-12-31')
        }
      } as IInterview;

      const updatedInterview = {
        ...interview,
        interviewLink: {
          ...interview.interviewLink,
          expirationDate: new Date('2027-12-31')
        }
      } as IInterview;

      mockService.getInterviewById.mockResolvedValue(interview);
      mockService.updateInterview.mockResolvedValue(updatedInterview);

      await InterviewController.generateInterviewLink(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedInterview.interviewLink
      });
    });
  });
});
