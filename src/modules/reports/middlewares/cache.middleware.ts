// src/modules/reports/middlewares/cache.middleware.ts

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * In-Memory Cache Store
 * Production'da Redis kullanılmalı
 */
interface ICacheEntry {
    data: any;
    etag: string;
    timestamp: number;
    expiresAt: number;
}

const cacheStore = new Map<string, ICacheEntry>();

/**
 * Cache key oluştur
 */
function generateCacheKey(req: Request): string {
    const baseKey = req.originalUrl || req.url;
    const userId = req.user?.id || 'anonymous';
    return `reports:${userId}:${baseKey}`;
}

/**
 * ETag oluştur
 */
function generateETag(data: any): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `"${hash}"`;
}

/**
 * Cache Middleware
 * 
 * Reports endpoint'leri için in-memory cache.
 * - ETag desteği (304 Not Modified)
 * - Conditional GET desteği (If-None-Match)
 * - TTL (Time To Live) desteği
 * 
 * @param ttlSeconds Cache süresi (saniye)
 */
export function cacheMiddleware(ttlSeconds: number = 300) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Sadece GET istekleri cache'lenir
        if (req.method !== 'GET') {
            next();
            return;
        }

        const cacheKey = generateCacheKey(req);
        const cached = cacheStore.get(cacheKey);
        const now = Date.now();

        // Cache hit ve henüz expire olmamış
        if (cached && cached.expiresAt > now) {
            // Conditional GET kontrolü
            const clientETag = req.headers['if-none-match'];
            
            if (clientETag && clientETag === cached.etag) {
                // Client'ın verisi güncel, 304 döndür
                res.status(304).end();
                return;
            }

            // Cache'den döndür
            res.set({
                'Cache-Control': `public, max-age=${Math.floor((cached.expiresAt - now) / 1000)}`,
                'ETag': cached.etag,
                'X-Cache': 'HIT',
                'X-Cache-TTL': `${Math.floor((cached.expiresAt - now) / 1000)}s`
            });
            
            res.json(cached.data);
            return;
        }

        // Cache miss - original response'u yakala
        const originalJson = res.json.bind(res);
        
        res.json = (data: any) => {
            // Response'u cache'le
            const etag = generateETag(data);
            const cacheEntry: ICacheEntry = {
                data,
                etag,
                timestamp: now,
                expiresAt: now + (ttlSeconds * 1000)
            };
            
            cacheStore.set(cacheKey, cacheEntry);

            // Cache headers ekle
            res.set({
                'Cache-Control': `public, max-age=${ttlSeconds}`,
                'ETag': etag,
                'X-Cache': 'MISS',
                'X-Cache-TTL': `${ttlSeconds}s`
            });

            return originalJson(data);
        };

        next();
    };
}

/**
 * Cache Invalidation
 * Belirli bir pattern'e uyan cache entry'lerini temizler
 */
export function invalidateCache(pattern?: string): number {
    let cleared = 0;
    
    if (!pattern) {
        cleared = cacheStore.size;
        cacheStore.clear();
    } else {
        const regex = new RegExp(pattern);
        for (const key of cacheStore.keys()) {
            if (regex.test(key)) {
                cacheStore.delete(key);
                cleared++;
            }
        }
    }
    
    return cleared;
}

/**
 * Cache Stats
 * Mevcut cache durumu
 */
export function getCacheStats(): {
    entries: number;
    keys: string[];
    memoryEstimate: string;
} {
    const keys = Array.from(cacheStore.keys());
    const memoryBytes = JSON.stringify(Array.from(cacheStore.entries())).length;
    
    return {
        entries: cacheStore.size,
        keys,
        memoryEstimate: `${Math.round(memoryBytes / 1024)} KB`
    };
}

/**
 * Expired cache temizleme (cleanup job için)
 */
export function cleanExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of cacheStore.entries()) {
        if (entry.expiresAt < now) {
            cacheStore.delete(key);
            cleaned++;
        }
    }
    
    return cleaned;
}

// Her 5 dakikada expired cache'leri temizle
setInterval(() => {
    const cleaned = cleanExpiredCache();
    if (cleaned > 0) {
        console.log(`🧹 Reports Cache: ${cleaned} expired entries cleaned`);
    }
}, 5 * 60 * 1000);