/**
 * Enterprise Authentication Configuration
 * Google-like session management for HR platform
 * 
 * Strateji:
 * - Access Token: Kısa süreli (15 dk), sık yenilenir
 * - Refresh Token: Sliding window (30 gün), aktivite ile uzar
 * - Absolute Max: 90 gün sonra mutlaka yeniden login gerekir
 * - Idle Timeout: 7 gün aktivite olmazsa oturum kapanır
 */

export const AUTH_CONFIG = {
    // Token Süreleri
    ACCESS_TOKEN_EXPIRY: '15m',           // 15 dakika - kısa ve güvenli
    ACCESS_TOKEN_EXPIRY_MS: 15 * 60 * 1000,
    
    REFRESH_TOKEN_EXPIRY: '30d',          // 30 gün - sliding window
    REFRESH_TOKEN_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
    
    // Oturum Limitleri
    ABSOLUTE_SESSION_MAX_DAYS: 90,        // Maksimum oturum süresi (gün)
    IDLE_TIMEOUT_DAYS: 7,                 // İnaktivite timeout (gün)
    
    // Cookie Ayarları
    COOKIE_ACCESS_TOKEN_MAX_AGE: 15 * 60 * 1000,        // 15 dakika
    COOKIE_REFRESH_TOKEN_MAX_AGE: 30 * 24 * 60 * 60 * 1000,  // 30 gün
    
    // Güvenlik Ayarları
    MAX_DEVICES_PER_USER: 5,              // Kullanıcı başına maksimum cihaz
    MAX_FAILED_REFRESH_ATTEMPTS: 5,       // Token kötüye kullanım limiti
    
    // Proactive Refresh (Frontend tarafından kullanılır)
    // Access token'ın son 2 dakikasına girildiğinde yenileme yapılır
    PROACTIVE_REFRESH_BUFFER_MS: 2 * 60 * 1000,  // 2 dakika
    
    // Background Sync Interval
    // Tab'lar arası senkronizasyon için heartbeat aralığı
    HEARTBEAT_INTERVAL_MS: 5 * 60 * 1000,  // 5 dakika
    
    // Token Claims
    TOKEN_ISSUER: 'hireai-platform',
    TOKEN_AUDIENCE: 'hireai-client',
} as const;

/**
 * Cookie yapılandırması
 */
export const getCookieConfig = (isProduction: boolean) => ({
    httpOnly: true,
    secure: isProduction || process.env.COOKIE_SECURE === 'true',
    sameSite: isProduction ? 'strict' as const : 'lax' as const,
    path: '/',
});

/**
 * Access Token cookie ayarları
 */
export const getAccessTokenCookieConfig = (isProduction: boolean) => ({
    ...getCookieConfig(isProduction),
    maxAge: AUTH_CONFIG.COOKIE_ACCESS_TOKEN_MAX_AGE,
});

/**
 * Refresh Token cookie ayarları
 */
export const getRefreshTokenCookieConfig = (isProduction: boolean) => ({
    ...getCookieConfig(isProduction),
    maxAge: AUTH_CONFIG.COOKIE_REFRESH_TOKEN_MAX_AGE,
});

export default AUTH_CONFIG;
