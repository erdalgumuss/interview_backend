// src/middlewares/asyncHandler.ts

import { Request, Response, NextFunction } from 'express';

// Express'in asenkron route handler'larını (Controller metotlarını) sarmalamak için kullanılır.
// Bu sayede Promise hataları (reject) doğrudan Express'in hata işleme middleware'ine iletilir.
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        // Promise'i çalıştırma ve sonucu beklerken oluşan hataları next() ile bir sonraki hata middleware'ine iletme.
        Promise.resolve(fn(req, res, next)).catch(next);
    };

export { asyncHandler };