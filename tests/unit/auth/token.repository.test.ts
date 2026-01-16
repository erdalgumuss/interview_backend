/**
 * Token Repository Unit Tests
 * Enterprise token management tests
 */

import TokenRepository from '@/modules/auth/repositories/token.repository';
import TokenModel from '@/modules/auth/models/token.model';
import { hashToken } from '@/utils/tokenUtils';
import { AUTH_CONFIG } from '@/config/auth.config';

// Mock dependencies
jest.mock('@/modules/auth/models/token.model');
jest.mock('@/utils/tokenUtils', () => ({
    hashToken: jest.fn((token) => `hashed_${token}`),
}));

describe('TokenRepository', () => {
    const mockClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        deviceInfo: 'Chrome on Windows',
    };

    const mockUserId = 'user123';
    const mockToken = 'refresh_token_123';
    const mockSessionId = 'session_123';
    const mockAbsoluteExp = Date.now() + 90 * 24 * 60 * 60 * 1000;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createRefreshToken', () => {
        it('should create token with sliding and absolute expiry', async () => {
            // Arrange
            (TokenModel.create as jest.Mock).mockResolvedValue({
                _id: 'token_id',
                user: mockUserId,
                sessionId: mockSessionId,
            });

            // Act
            const result = await TokenRepository.createRefreshToken(
                mockUserId,
                mockToken,
                mockSessionId,
                mockAbsoluteExp,
                mockClientInfo
            );

            // Assert
            expect(TokenModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: mockUserId,
                    token: `hashed_${mockToken}`,
                    sessionId: mockSessionId,
                    type: 'refresh',
                    isRevoked: false,
                    ip: mockClientInfo.ip,
                    userAgent: mockClientInfo.userAgent,
                })
            );
            expect(result).toBeDefined();
        });

        it('should set correct expiry dates', async () => {
            // Arrange
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);
            (TokenModel.create as jest.Mock).mockResolvedValue({});

            // Act
            await TokenRepository.createRefreshToken(
                mockUserId,
                mockToken,
                mockSessionId,
                mockAbsoluteExp,
                mockClientInfo
            );

            // Assert
            const createCall = (TokenModel.create as jest.Mock).mock.calls[0][0];
            expect(createCall.expiresAt.getTime()).toBeCloseTo(
                now + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_MS,
                -3 // Allow 1 second tolerance
            );
            expect(createCall.absoluteExpiresAt.getTime()).toBe(mockAbsoluteExp);
        });
    });

    describe('findRefreshToken', () => {
        const mockFoundToken = {
            _id: 'token_id',
            user: mockUserId,
            token: `hashed_${mockToken}`,
            sessionId: mockSessionId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
            absoluteExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            lastActivityAt: new Date(),
            isRevoked: false,
        };

        it('should find valid token and update lastUsed', async () => {
            // Arrange
            (TokenModel.findOne as jest.Mock).mockResolvedValue(mockFoundToken);
            (TokenModel.updateOne as jest.Mock).mockResolvedValue({});

            // Act
            const result = await TokenRepository.findRefreshToken(mockUserId, mockToken);

            // Assert
            expect(TokenModel.findOne).toHaveBeenCalledWith({
                user: mockUserId,
                token: `hashed_${mockToken}`,
                isRevoked: false,
            });
            expect(result).toBeDefined();
        });

        it('should return null for expired sliding window token', async () => {
            // Arrange
            const expiredToken = {
                ...mockFoundToken,
                expiresAt: new Date(Date.now() - 1000), // Expired
            };
            (TokenModel.findOne as jest.Mock).mockResolvedValue(expiredToken);

            // Act
            const result = await TokenRepository.findRefreshToken(mockUserId, mockToken);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null for expired absolute session', async () => {
            // Arrange
            const expiredAbsoluteToken = {
                ...mockFoundToken,
                absoluteExpiresAt: new Date(Date.now() - 1000), // Expired
            };
            (TokenModel.findOne as jest.Mock).mockResolvedValue(expiredAbsoluteToken);

            // Act
            const result = await TokenRepository.findRefreshToken(mockUserId, mockToken);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null for idle timeout (7 days inactivity)', async () => {
            // Arrange
            const idleToken = {
                ...mockFoundToken,
                lastActivityAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
            };
            (TokenModel.findOne as jest.Mock).mockResolvedValue(idleToken);
            (TokenModel.updateOne as jest.Mock).mockResolvedValue({});

            // Act
            const result = await TokenRepository.findRefreshToken(mockUserId, mockToken);

            // Assert
            expect(result).toBeNull();
        });

        it('should return null for non-existent token', async () => {
            // Arrange
            (TokenModel.findOne as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await TokenRepository.findRefreshToken(mockUserId, mockToken);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('rotateRefreshToken', () => {
        it('should revoke old token and create new one', async () => {
            // Arrange
            const newToken = 'new_refresh_token';
            (TokenModel.updateOne as jest.Mock).mockResolvedValue({});
            (TokenModel.create as jest.Mock).mockResolvedValue({});

            // Act
            await TokenRepository.rotateRefreshToken(
                mockUserId,
                mockToken,
                newToken,
                mockSessionId,
                mockAbsoluteExp,
                mockClientInfo
            );

            // Assert
            expect(TokenModel.updateOne).toHaveBeenCalledWith(
                { user: mockUserId, token: `hashed_${mockToken}` },
                { isRevoked: true }
            );
            expect(TokenModel.create).toHaveBeenCalled();
        });
    });

    describe('enforceTokenLimit', () => {
        it('should revoke oldest tokens when limit exceeded', async () => {
            // Arrange
            const mockTokens = [
                { _id: 't1', lastActivityAt: new Date() },
                { _id: 't2', lastActivityAt: new Date() },
                { _id: 't3', lastActivityAt: new Date() },
                { _id: 't4', lastActivityAt: new Date() },
                { _id: 't5', lastActivityAt: new Date() },
                { _id: 't6', lastActivityAt: new Date() }, // Should be revoked
                { _id: 't7', lastActivityAt: new Date() }, // Should be revoked
            ];
            (TokenModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockTokens),
            });
            (TokenModel.updateMany as jest.Mock).mockResolvedValue({});

            // Act
            await TokenRepository.enforceTokenLimit(mockUserId, 5);

            // Assert
            expect(TokenModel.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ['t6', 't7'] } },
                { isRevoked: true }
            );
        });

        it('should not revoke tokens when under limit', async () => {
            // Arrange
            const mockTokens = [
                { _id: 't1' },
                { _id: 't2' },
                { _id: 't3' },
            ];
            (TokenModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockTokens),
            });

            // Act
            await TokenRepository.enforceTokenLimit(mockUserId, 5);

            // Assert
            expect(TokenModel.updateMany).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllTokens', () => {
        it('should revoke all user tokens', async () => {
            // Arrange
            (TokenModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

            // Act
            await TokenRepository.revokeAllTokens(mockUserId);

            // Assert
            expect(TokenModel.updateMany).toHaveBeenCalledWith(
                { user: mockUserId },
                { isRevoked: true }
            );
        });
    });

    describe('detectSuspiciousActivity', () => {
        it('should return true when 3+ different devices detected', async () => {
            // Arrange
            const mockTokens = [
                { ip: '192.168.1.1', userAgent: 'Chrome' },
                { ip: '192.168.1.2', userAgent: 'Firefox' },
                { ip: '10.0.0.1', userAgent: 'Safari' },
            ];
            (TokenModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(mockTokens),
                }),
            });

            // Act
            const result = await TokenRepository.detectSuspiciousActivity(
                mockUserId,
                '10.0.0.2',
                'Edge'
            );

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when less than 3 devices', async () => {
            // Arrange
            const mockTokens = [
                { ip: '192.168.1.1', userAgent: 'Chrome' },
                { ip: '192.168.1.1', userAgent: 'Chrome' },
            ];
            (TokenModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(mockTokens),
                }),
            });

            // Act
            const result = await TokenRepository.detectSuspiciousActivity(
                mockUserId,
                '192.168.1.1',
                'Chrome'
            );

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('getActiveSessions', () => {
        it('should return only valid sessions', async () => {
            // Arrange
            const mockSessions = [
                { sessionId: 's1', ip: '192.168.1.1' },
                { sessionId: 's2', ip: '192.168.1.2' },
            ];
            (TokenModel.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSessions),
            });

            // Act
            const result = await TokenRepository.getActiveSessions(mockUserId);

            // Assert
            expect(TokenModel.find).toHaveBeenCalledWith({
                user: mockUserId,
                isRevoked: false,
                expiresAt: { $gt: expect.any(Date) },
                absoluteExpiresAt: { $gt: expect.any(Date) },
            });
            expect(result).toHaveLength(2);
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should delete expired and old revoked tokens', async () => {
            // Arrange
            (TokenModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 10 });

            // Act
            const result = await TokenRepository.cleanupExpiredTokens();

            // Assert
            expect(TokenModel.deleteMany).toHaveBeenCalled();
            expect(result).toBe(10);
        });
    });
});
