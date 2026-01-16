/**
 * Jest Test Setup
 * Common setup for all tests
 */

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
process.env.NODE_ENV = 'test';

// Silence console during tests (optional)
// global.console = {
//     ...console,
//     log: jest.fn(),
//     debug: jest.fn(),
//     info: jest.fn(),
// };

// Reset all mocks after each test
afterEach(() => {
    jest.clearAllMocks();
});
