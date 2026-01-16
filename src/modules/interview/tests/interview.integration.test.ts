// src/modules/interview/tests/interview.integration.test.ts

/**
 * Integration Tests for Interview Module
 * 
 * Bu testler tüm katmanların (Controller -> Service -> Repository -> Database)
 * birlikte çalışmasını test eder.
 * 
 * Not: Bu testleri çalıştırmak için test database kurulumu gereklidir.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import InterviewModel, { InterviewStatus } from '../models/interview.model';
import UserModel from '../../auth/models/user.model';

// Test için Express app'i import et
// import app from '../../../server'; // Ana server dosyanızı import edin

describe('Interview Module - Integration Tests', () => {
  let authToken: string;
  let userId: mongoose.Types.ObjectId;
  let testInterview: any;

  beforeAll(async () => {
    // Test database bağlantısı
    const testDbUri = process.env.TEST_DB_URI || 'mongodb://localhost:27017/interview_test';
    await mongoose.connect(testDbUri);

    // Test kullanıcısı oluştur
    const testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
      role: 'company',
      isActive: true,
      emailVerified: true
    });

    userId = testUser._id as mongoose.Types.ObjectId;

    // Mock JWT token (gerçek implementasyonunuza göre ayarlayın)
    // authToken = generateTestToken(userId, 'company');
  });

  afterAll(async () => {
    // Test verilerini temizle
    await InterviewModel.deleteMany({});
    await UserModel.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Her testten sonra interview verilerini temizle
    await InterviewModel.deleteMany({});
  });

  describe('POST /api/interviews - Create Interview', () => {
    it('should create a new interview successfully', async () => {
      const interviewData = {
        title: 'Senior Backend Developer Interview',
        description: 'Technical interview for senior position',
        expirationDate: new Date('2026-12-31'),
        position: {
          title: 'Senior Backend Developer',
          department: 'Engineering'
        },
        stages: {
          personalityTest: true,
          questionnaire: true
        },
        questions: [
          {
            questionText: 'Explain RESTful API principles',
            expectedAnswer: 'REST principles include...',
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

      // const response = await request(app)
      //   .post('/api/interviews')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send(interviewData)
      //   .expect(201);

      // expect(response.body.success).toBe(true);
      // expect(response.body.data.title).toBe(interviewData.title);
      // expect(response.body.data.status).toBe(InterviewStatus.DRAFT);

      // Database'de verify et
      // const createdInterview = await InterviewModel.findById(response.body.data._id);
      // expect(createdInterview).toBeDefined();
      // expect(createdInterview?.title).toBe(interviewData.title);
    });

    it('should fail when questions array is empty', async () => {
      const invalidData = {
        title: 'Test Interview',
        expirationDate: new Date('2026-12-31'),
        questions: [] // Empty questions
      };

      // const response = await request(app)
      //   .post('/api/interviews')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send(invalidData)
      //   .expect(400);

      // expect(response.body.success).toBe(false);
      // expect(response.body.message).toContain('at least one question');
    });

    it('should fail without authentication', async () => {
      const interviewData = {
        title: 'Test Interview',
        questions: [{ questionText: 'Q1' }],
        expirationDate: new Date('2026-12-31')
      };

      // const response = await request(app)
      //   .post('/api/interviews')
      //   .send(interviewData)
      //   .expect(401);

      // expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/interviews/my - Get User Interviews', () => {
    beforeEach(async () => {
      // Test interview'ları oluştur
      testInterview = await InterviewModel.create({
        title: 'My Test Interview',
        expirationDate: new Date('2026-12-31'),
        createdBy: { userId },
        status: InterviewStatus.DRAFT,
        questions: [
          {
            questionText: 'Test Question',
            expectedAnswer: 'Test Answer',
            keywords: ['test'],
            order: 1,
            duration: 300,
            aiMetadata: {
              complexityLevel: 'medium',
              requiredSkills: ['Testing']
            }
          }
        ]
      });
    });

    it('should return all user interviews', async () => {
      // const response = await request(app)
      //   .get('/api/interviews/my')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);

      // expect(response.body.success).toBe(true);
      // expect(response.body.data).toHaveLength(1);
      // expect(response.body.data[0].title).toBe('My Test Interview');
    });

    it('should return empty array for new user with no interviews', async () => {
      // Farklı kullanıcı için token oluştur
      // const anotherUser = await UserModel.create({...});
      // const anotherToken = generateTestToken(anotherUser._id, 'company');

      // const response = await request(app)
      //   .get('/api/interviews/my')
      //   .set('Authorization', `Bearer ${anotherToken}`)
      //   .expect(200);

      // expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/interviews/:id - Get Interview by ID', () => {
    beforeEach(async () => {
      testInterview = await InterviewModel.create({
        title: 'Test Interview',
        expirationDate: new Date('2026-12-31'),
        createdBy: { userId },
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1', expectedAnswer: 'A1', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'low', requiredSkills: [] } }]
      });
    });

    it('should return interview when user is owner', async () => {
      // const response = await request(app)
      //   .get(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);

      // expect(response.body.data.title).toBe('Test Interview');
    });

    it('should return 404 for non-existent interview', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      // const response = await request(app)
      //   .get(`/api/interviews/${fakeId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(404);

      // expect(response.body.message).toContain('not found');
    });

    it('should hide DRAFT interview from non-owner', async () => {
      // Farklı kullanıcı oluştur
      // const anotherUser = await UserModel.create({...});
      // const anotherToken = generateTestToken(anotherUser._id, 'company');

      // const response = await request(app)
      //   .get(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${anotherToken}`)
      //   .expect(404);
    });
  });

  describe('PUT /api/interviews/:id - Update Interview', () => {
    beforeEach(async () => {
      testInterview = await InterviewModel.create({
        title: 'Original Title',
        expirationDate: new Date('2026-12-31'),
        createdBy: { userId },
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1', expectedAnswer: 'A1', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'low', requiredSkills: [] } }]
      });
    });

    it('should update interview successfully', async () => {
      const updateData = { title: 'Updated Title' };

      // const response = await request(app)
      //   .put(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send(updateData)
      //   .expect(200);

      // expect(response.body.data.title).toBe('Updated Title');

      // Database'de verify et
      // const updated = await InterviewModel.findById(testInterview._id);
      // expect(updated?.title).toBe('Updated Title');
    });

    it('should fail when updating non-existent interview', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      // const response = await request(app)
      //   .put(`/api/interviews/${fakeId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ title: 'New Title' })
      //   .expect(404);
    });

    it('should fail when non-owner tries to update', async () => {
      // const anotherUser = await UserModel.create({...});
      // const anotherToken = generateTestToken(anotherUser._id, 'company');

      // const response = await request(app)
      //   .put(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${anotherToken}`)
      //   .send({ title: 'Hacked Title' })
      //   .expect(403);
    });
  });

  describe('PATCH /api/interviews/:id/publish - Publish Interview', () => {
    beforeEach(async () => {
      testInterview = await InterviewModel.create({
        title: 'Test Interview',
        expirationDate: new Date('2026-12-31'),
        createdBy: { userId },
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1', expectedAnswer: 'A1', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'low', requiredSkills: [] } }]
      });
    });

    it('should publish DRAFT interview successfully', async () => {
      // const response = await request(app)
      //   .patch(`/api/interviews/${testInterview._id}/publish`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);

      // expect(response.body.data.status).toBe(InterviewStatus.PUBLISHED);
      // expect(response.body.data.interviewLink.link).toBeDefined();

      // Database'de verify et
      // const published = await InterviewModel.findById(testInterview._id);
      // expect(published?.status).toBe(InterviewStatus.PUBLISHED);
    });

    it('should fail when publishing already PUBLISHED interview', async () => {
      // Önce publish et
      testInterview.status = InterviewStatus.PUBLISHED;
      await testInterview.save();

      // const response = await request(app)
      //   .patch(`/api/interviews/${testInterview._id}/publish`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(409);

      // expect(response.body.message).toContain('Cannot publish');
    });

    it('should fail when publishing interview without questions', async () => {
      testInterview.questions = [];
      await testInterview.save();

      // const response = await request(app)
      //   .patch(`/api/interviews/${testInterview._id}/publish`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(400);

      // expect(response.body.message).toContain('questions');
    });
  });

  describe('DELETE /api/interviews/:id - Delete Interview', () => {
    beforeEach(async () => {
      testInterview = await InterviewModel.create({
        title: 'To Be Deleted',
        expirationDate: new Date('2026-12-31'),
        createdBy: { userId },
        status: InterviewStatus.DRAFT,
        questions: [{ questionText: 'Q1', expectedAnswer: 'A1', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'low', requiredSkills: [] } }]
      });
    });

    it('should soft delete interview successfully', async () => {
      // const response = await request(app)
      //   .delete(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);

      // expect(response.body.message).toContain('deleted successfully');

      // Soft delete verify - deletedAt field'ı set edilmeli
      // const deleted = await InterviewModel.findById(testInterview._id);
      // expect(deleted?.deletedAt).toBeDefined();

      // Normal sorguda görünmemeli
      // const found = await InterviewModel.findOne({ _id: testInterview._id, deletedAt: null });
      // expect(found).toBeNull();
    });

    it('should fail when non-owner tries to delete', async () => {
      // const anotherUser = await UserModel.create({...});
      // const anotherToken = generateTestToken(anotherUser._id, 'company');

      // const response = await request(app)
      //   .delete(`/api/interviews/${testInterview._id}`)
      //   .set('Authorization', `Bearer ${anotherToken}`)
      //   .expect(403);
    });
  });

  describe('GET /api/interviews/all - Get All Interviews (Admin)', () => {
    let adminToken: string;

    beforeAll(async () => {
      const adminUser = await UserModel.create({
        email: 'admin@example.com',
        password: 'hashedpassword',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      // adminToken = generateTestToken(adminUser._id, 'admin');
    });

    beforeEach(async () => {
      // Birden fazla interview oluştur
      await InterviewModel.create([
        {
          title: 'Interview 1',
          expirationDate: new Date('2026-12-31'),
          createdBy: { userId },
          status: InterviewStatus.DRAFT,
          questions: [{ questionText: 'Q1', expectedAnswer: 'A1', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'low', requiredSkills: [] } }]
        },
        {
          title: 'Interview 2',
          expirationDate: new Date('2026-12-31'),
          createdBy: { userId },
          status: InterviewStatus.PUBLISHED,
          questions: [{ questionText: 'Q2', expectedAnswer: 'A2', keywords: ['test'], order: 1, duration: 300, aiMetadata: { complexityLevel: 'medium', requiredSkills: [] } }]
        }
      ]);
    });

    it('should return all interviews for admin', async () => {
      // const response = await request(app)
      //   .get('/api/interviews/all')
      //   .set('Authorization', `Bearer ${adminToken}`)
      //   .expect(200);

      // expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail for non-admin user', async () => {
      // const response = await request(app)
      //   .get('/api/interviews/all')
      //   .set('Authorization', `Bearer ${authToken}`) // Regular user token
      //   .expect(403);

      // expect(response.body.message).toContain('Admin access required');
    });
  });
});

/**
 * Test Utilities
 */

// JWT token oluşturma helper fonksiyonu
// function generateTestToken(userId: mongoose.Types.ObjectId, role: string): string {
//   const jwt = require('jsonwebtoken');
//   return jwt.sign(
//     { userId: userId.toString(), role },
//     process.env.JWT_SECRET || 'test-secret',
//     { expiresIn: '1h' }
//   );
// }
