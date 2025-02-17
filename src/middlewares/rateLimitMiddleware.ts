import rateLimit from 'express-rate-limit';

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakika içinde en fazla 5 istek
  message: 'Too many OTP requests, please try again later.',
});

export default otpRateLimiter;
