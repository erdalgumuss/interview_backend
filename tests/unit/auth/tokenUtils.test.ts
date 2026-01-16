/**
 * Token Utilities Unit Tests
 * Tests for JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { 
    generateAccessToken, 
    generateRefreshToken, 
    decodeRefreshToken,
    isAbsoluteExpired 
} from '@/utils/tokenUtils';
import { AUTH_CONFIG } from '@/config/auth.config';

// Mock jwt
jest.mock('jsonwebtoken');

describe('tokenUtils', () => {
    const mockUserId = 'user123';
    const mockRole = 'user';
    const mockVersion = 1;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_jwt_secret';
        process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    });

    describe('generateAccessToken', () => {
        it('should generate access token with correct payload', () => {
            // Arrange
            (jwt.sign as jest.Mock).mockReturnValue('access_token_123');

            // Act
            const token = generateAccessToken(mockUserId, mockRole);

            // Assert
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    role: mockRole,
                    iss: AUTH_CONFIG.TOKEN_ISSUER,
                    aud: AUTH_CONFIG.TOKEN_AUDIENCE,
                }),
                expect.any(String),
                expect.objectContaining({
                    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
                    algorithm: 'HS256',
                })
            );
            expect(token).toBe('access_token_123');
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate refresh token with sessionId and absoluteExp', () => {
            // Arrange
            (jwt.sign as jest.Mock).mockReturnValue('refresh_token_123');

            // Act
            const token = generateRefreshToken(mockUserId, mockVersion);

            // Assert
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    version: mockVersion,
                    sessionId: expect.any(String),
                    absoluteExp: expect.any(Number),
                }),
                expect.any(String),
                expect.objectContaining({
                    expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
                })
            );
            expect(token).toBe('refresh_token_123');
        });

        it('should preserve existing sessionId and absoluteExp on rotation', () => {
            // Arrange
            const existingSessionId = 'existing_session';
            const existingAbsoluteExp = Date.now() + 30 * 24 * 60 * 60 * 1000;
            (jwt.sign as jest.Mock).mockReturnValue('rotated_token');

            // Act
            const token = generateRefreshToken(
                mockUserId, 
                mockVersion, 
                existingSessionId, 
                existingAbsoluteExp
            );

            // Assert
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: existingSessionId,
                    absoluteExp: existingAbsoluteExp,
                }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should set absoluteExp to 90 days for new sessions', () => {
            // Arrange
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);
            (jwt.sign as jest.Mock).mockReturnValue('new_token');

            // Act
            generateRefreshToken(mockUserId, mockVersion);

            // Assert
            const signCall = (jwt.sign as jest.Mock).mock.calls[0][0];
            const expectedAbsoluteExp = now + (AUTH_CONFIG.ABSOLUTE_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000);
            expect(signCall.absoluteExp).toBe(expectedAbsoluteExp);
        });
    });

    describe('decodeRefreshToken', () => {
        it('should decode valid refresh token', () => {
            // Arrange
            const mockPayload = {
                userId: mockUserId,
                version: mockVersion,
                sessionId: 'session_123',
                absoluteExp: Date.now() + 90 * 24 * 60 * 60 * 1000,
            };
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            // Act
            const decoded = decodeRefreshToken('valid_token');

            // Assert
            expect(decoded).toEqual(mockPayload);
            expect(jwt.verify).toHaveBeenCalledWith('valid_token', expect.any(String));
        });

        it('should throw on invalid token', () => {
            // Arrange
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            // Act & Assert
            expect(() => decodeRefreshToken('invalid_token')).toThrow();
        });
    });

    describe('isAbsoluteExpired', () => {
        it('should return true for expired timestamp', () => {
            const expiredTimestamp = Date.now() - 1000;
            expect(isAbsoluteExpired(expiredTimestamp)).toBe(true);
        });

        it('should return false for valid timestamp', () => {
            const validTimestamp = Date.now() + 1000;
            expect(isAbsoluteExpired(validTimestamp)).toBe(false);
        });

        it('should return true for exactly now', () => {
            const now = Date.now();
            // Mock Date.now to return a value AFTER our timestamp
            jest.spyOn(Date, 'now').mockReturnValue(now + 1);
            expect(isAbsoluteExpired(now)).toBe(true);
        });
    });
});
