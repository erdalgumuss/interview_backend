import rateLimit from 'express-rate-limit';

export const rateLimitMiddleware = (options: { windowMs: number; max: number }) => {
    return rateLimit({
        windowMs: options.windowMs, // Süre
        max: options.max, // Maksimum istek
        message: 'Too many requests, please try again later.',
        headers: true,
    });
};
