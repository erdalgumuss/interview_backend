/**
 * Auth Service Unit Tests
 * Enterprise refresh token mechanism tests
 */

import AuthService from '@/modules/auth/services/auth.service';
import AuthRepository from '@/modules/auth/repositories/auth.repository';
import TokenRepository from '@/modules/auth/repositories/token.repository';
import { generateAccessToken, generateRefreshToken, decodeRefreshToken } from '@/utils/tokenUtils';
import { AppError } from '@/middlewares/errors/appError';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('@/modules/auth/repositories/auth.repository');
jest.mock('@/modules/auth/repositories/token.repository');
jest.mock('@/utils/tokenUtils');
jest.mock('@/utils/emailUtils', () => ({
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
}));
jest.mock('bcrypt');

describe('AuthService', () => {
    const mockClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
    };

    const mockUser = {
        _id: { toString: () => 'user123' },
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
        role: 'user',
        isActive: true,
        emailVerified: true,
        tokenVersion: 1,
        accountLockedUntil: null,
        incrementFailedLogins: jest.fn(),
        updateLastLogin: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loginUser', () => {
        const loginData = { email: 'test@example.com', password: 'password123' };

        it('should successfully login and return tokens', async () => {
            // Arrange
            (AuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (generateAccessToken as jest.Mock).mockReturnValue('access_token_123');
            (generateRefreshToken as jest.Mock).mockReturnValue('refresh_token_123');
            (decodeRefreshToken as jest.Mock).mockReturnValue({
                userId: 'user123',
                version: 2,
                sessionId: 'session_123',
                absoluteExp: Date.now() + 90 * 24 * 60 * 60 * 1000,
            });
            (TokenRepository.createRefreshToken as jest.Mock).mockResolvedValue({});
            (TokenRepository.enforceTokenLimit as jest.Mock).mockResolvedValue({});

            // Act
            const result = await AuthService.loginUser(loginData, mockClientInfo);

            // Assert
            expect(result.user).toBeDefined();
            expect(result.accessToken).toBe('access_token_123');
            expect(result.refreshToken).toBe('refresh_token_123');
            expect(AuthRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
            expect(TokenRepository.createRefreshToken).toHaveBeenCalled();
            expect(TokenRepository.enforceTokenLimit).toHaveBeenCalledWith('user123');
        });

        it('should throw error for invalid email', async () => {
            // Arrange
            (AuthRepository.findByEmail as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(AuthService.loginUser(loginData, mockClientInfo))
                .rejects
                .toThrow('Invalid credentials');
        });

        it('should throw error for invalid password and increment failed logins', async () => {
            // Arrange
            (AuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act & Assert
            await expect(AuthService.loginUser(loginData, mockClientInfo))
                .rejects
                .toThrow('Invalid credentials');
            expect(mockUser.incrementFailedLogins).toHaveBeenCalled();
        });

        it('should throw error for unverified email', async () => {
            // Arrange
            const unverifiedUser = { ...mockUser, emailVerified: false };
            (AuthRepository.findByEmail as jest.Mock).mockResolvedValue(unverifiedUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Act & Assert
            await expect(AuthService.loginUser(loginData, mockClientInfo))
                .rejects
                .toThrow('Email is not verified.');
        });

        it('should throw error for locked account', async () => {
            // Arrange
            const lockedUser = { 
                ...mockUser, 
                accountLockedUntil: new Date(Date.now() + 60000) 
            };
            (AuthRepository.findByEmail as jest.Mock).mockResolvedValue(lockedUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Act & Assert
            await expect(AuthService.loginUser(loginData, mockClientInfo))
                .rejects
                .toThrow('Account locked');
        });
    });

    describe('refreshAccessToken', () => {
        const mockRefreshToken = 'valid_refresh_token';
        const mockDecodedToken = {
            userId: 'user123',
            version: 1,
            sessionId: 'session_123',
            absoluteExp: Date.now() + 90 * 24 * 60 * 60 * 1000,
        };

        it('should successfully refresh tokens with sliding window', async () => {
            // Arrange
            (decodeRefreshToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (AuthRepository.findById as jest.Mock).mockResolvedValue(mockUser);
            (TokenRepository.findRefreshToken as jest.Mock).mockResolvedValue({
                ip: mockClientInfo.ip,
                userAgent: mockClientInfo.userAgent,
            });
            (generateAccessToken as jest.Mock).mockReturnValue('new_access_token');
            (generateRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');
            (TokenRepository.rotateRefreshToken as jest.Mock).mockResolvedValue({});

            // Act
            const result = await AuthService.refreshAccessToken(mockRefreshToken, mockClientInfo);

            // Assert
            expect(result.accessToken).toBe('new_access_token');
            expect(result.refreshToken).toBe('new_refresh_token');
            expect(TokenRepository.rotateRefreshToken).toHaveBeenCalledWith(
                'user123',
                mockRefreshToken,
                'new_refresh_token',
                mockDecodedToken.sessionId,
                mockDecodedToken.absoluteExp,
                mockClientInfo
            );
        });

        it('should reject expired absolute session (90 days)', async () => {
            // Arrange
            const expiredToken = {
                ...mockDecodedToken,
                absoluteExp: Date.now() - 1000, // Expired
            };
            (decodeRefreshToken as jest.Mock).mockReturnValue(expiredToken);
            (TokenRepository.revokeBySessionId as jest.Mock).mockResolvedValue({});

            // Act & Assert
            await expect(AuthService.refreshAccessToken(mockRefreshToken, mockClientInfo))
                .rejects
                .toThrow('Session expired');
            expect(TokenRepository.revokeBySessionId).toHaveBeenCalledWith(expiredToken.sessionId);
        });

        it('should reject inactive user', async () => {
            // Arrange
            (decodeRefreshToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (AuthRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

            // Act & Assert
            await expect(AuthService.refreshAccessToken(mockRefreshToken, mockClientInfo))
                .rejects
                .toThrow('User not found or inactive');
        });

        it('should reject token version mismatch', async () => {
            // Arrange
            const wrongVersionToken = { ...mockDecodedToken, version: 999 };
            (decodeRefreshToken as jest.Mock).mockReturnValue(wrongVersionToken);
            (AuthRepository.findById as jest.Mock).mockResolvedValue(mockUser);
            (TokenRepository.revokeBySessionId as jest.Mock).mockResolvedValue({});

            // Act & Assert
            await expect(AuthService.refreshAccessToken(mockRefreshToken, mockClientInfo))
                .rejects
                .toThrow('Session invalidated');
        });

        it('should reject when token not found in DB (idle timeout)', async () => {
            // Arrange
            (decodeRefreshToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (AuthRepository.findById as jest.Mock).mockResolvedValue(mockUser);
            (TokenRepository.findRefreshToken as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(AuthService.refreshAccessToken(mockRefreshToken, mockClientInfo))
                .rejects
                .toThrow('Session expired');
        });

        it('should detect suspicious activity from different devices', async () => {
            // Arrange
            const differentClient = { ip: '10.0.0.1', userAgent: 'Different Browser' };
            (decodeRefreshToken as jest.Mock).mockReturnValue(mockDecodedToken);
            (AuthRepository.findById as jest.Mock).mockResolvedValue(mockUser);
            (TokenRepository.findRefreshToken as jest.Mock).mockResolvedValue({
                ip: mockClientInfo.ip,
                userAgent: mockClientInfo.userAgent,
            });
            (TokenRepository.detectSuspiciousActivity as jest.Mock).mockResolvedValue(true);
            (AuthRepository.flagSuspiciousActivity as jest.Mock).mockResolvedValue({});
            (TokenRepository.revokeAllTokens as jest.Mock).mockResolvedValue({});

            // Act & Assert
            await expect(AuthService.refreshAccessToken(mockRefreshToken, differentClient))
                .rejects
                .toThrow('Suspicious activity detected');
            expect(TokenRepository.revokeAllTokens).toHaveBeenCalledWith('user123');
        });
    });

    describe('logoutUser', () => {
        it('should successfully revoke refresh token', async () => {
            // Arrange
            (TokenRepository.revokeToken as jest.Mock).mockResolvedValue({});
            (TokenRepository.hashToken as jest.Mock).mockReturnValue('hashed_token');

            // Act
            await AuthService.logoutUser('refresh_token_123');

            // Assert
            expect(TokenRepository.revokeToken).toHaveBeenCalled();
        });
    });

    describe('getActiveSessions', () => {
        it('should return formatted active sessions', async () => {
            // Arrange
            const mockSessions = [
                {
                    sessionId: 'session_1',
                    deviceInfo: 'Chrome on Windows',
                    ip: '192.168.1.1',
                    userAgent: 'Mozilla/5.0',
                    lastActivityAt: new Date(),
                    createdAt: new Date(),
                    expiresAt: new Date(),
                },
            ];
            (TokenRepository.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);

            // Act
            const result = await AuthService.getActiveSessions('user123');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].sessionId).toBe('session_1');
        });
    });

    describe('revokeAllSessions', () => {
        it('should revoke all user sessions', async () => {
            // Arrange
            (TokenRepository.revokeAllTokens as jest.Mock).mockResolvedValue({});

            // Act
            await AuthService.revokeAllSessions('user123');

            // Assert
            expect(TokenRepository.revokeAllTokens).toHaveBeenCalledWith('user123');
        });
    });
});
