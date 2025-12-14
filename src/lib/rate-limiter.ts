/**
 * Rate Limiter
 * 
 * Simple in-memory rate limiter for authentication endpoints.
 * Prevents brute force attacks by limiting attempts per IP/email.
 */

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
    attempts: number;
    firstAttempt: number;
    blockedUntil: number | null;
}

interface RateLimitConfig {
    maxAttempts: number;      // Max attempts before blocking
    windowMs: number;         // Time window in milliseconds
    blockDurationMs: number;  // How long to block after exceeding
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,        // 15 minutes
        blockDurationMs: 30 * 60 * 1000,  // 30 minutes block
    },
    recovery: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,         // 1 hour
        blockDurationMs: 60 * 60 * 1000,  // 1 hour block
    },
    register: {
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000,         // 1 hour
        blockDurationMs: 60 * 60 * 1000,  // 1 hour block
    },
};

// In-memory store (resets on server restart - fine for dev, use Redis in prod)
const rateLimitStore = new Map<string, RateLimitEntry>();

// ============================================================================
// RATE LIMITER FUNCTIONS
// ============================================================================

/**
 * Generate a unique key for rate limiting
 */
function getKey(type: string, identifier: string): string {
    return `${type}:${identifier}`;
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        // Remove entries that are no longer blocked and outside window
        if (
            (!entry.blockedUntil || entry.blockedUntil < now) &&
            (now - entry.firstAttempt > RATE_LIMITS.login.windowMs * 2)
        ) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check if an action is rate limited
 * @param type - Type of action (login, recovery, register)
 * @param identifier - Unique identifier (email or IP)
 * @returns Object with isLimited flag and retry info
 */
export function checkRateLimit(
    type: 'login' | 'recovery' | 'register',
    identifier: string
): { isLimited: boolean; retryAfterMs: number; attemptsRemaining: number } {
    const config = RATE_LIMITS[type];
    const key = getKey(type, identifier.toLowerCase());
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
        return {
            isLimited: true,
            retryAfterMs: entry.blockedUntil - now,
            attemptsRemaining: 0,
        };
    }

    // Check if window has expired, reset if so
    if (entry && (now - entry.firstAttempt > config.windowMs)) {
        entry = undefined;
        rateLimitStore.delete(key);
    }

    const attemptsRemaining = entry
        ? Math.max(0, config.maxAttempts - entry.attempts)
        : config.maxAttempts;

    return {
        isLimited: false,
        retryAfterMs: 0,
        attemptsRemaining,
    };
}

/**
 * Record an attempt for rate limiting
 * @param type - Type of action
 * @param identifier - Unique identifier
 * @param success - Whether the attempt was successful (resets on success)
 */
export function recordAttempt(
    type: 'login' | 'recovery' | 'register',
    identifier: string,
    success: boolean
): void {
    const config = RATE_LIMITS[type];
    const key = getKey(type, identifier.toLowerCase());
    const now = Date.now();

    // On success, clear rate limit for this identifier
    if (success) {
        rateLimitStore.delete(key);
        console.log(`[RATE_LIMIT] Cleared for ${type}:${identifier.slice(0, 5)}... (success)`);
        return;
    }

    // Get or create entry
    let entry = rateLimitStore.get(key);

    if (!entry || (now - entry.firstAttempt > config.windowMs)) {
        entry = {
            attempts: 1,
            firstAttempt: now,
            blockedUntil: null,
        };
    } else {
        entry.attempts++;
    }

    // Check if should block
    if (entry.attempts >= config.maxAttempts) {
        entry.blockedUntil = now + config.blockDurationMs;
        console.warn(`[RATE_LIMIT] BLOCKED ${type}:${identifier.slice(0, 5)}... for ${config.blockDurationMs / 60000} minutes`);
    }

    rateLimitStore.set(key, entry);
    console.log(`[RATE_LIMIT] Attempt ${entry.attempts}/${config.maxAttempts} for ${type}:${identifier.slice(0, 5)}...`);
}

/**
 * Format retry time for user display
 */
export function formatRetryTime(ms: number): string {
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 60) {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
}

/**
 * Get rate limit status for display
 */
export function getRateLimitStatus(
    type: 'login' | 'recovery' | 'register',
    identifier: string
): string {
    const { isLimited, retryAfterMs, attemptsRemaining } = checkRateLimit(type, identifier);

    if (isLimited) {
        return `Demasiados intentos. Intenta de nuevo en ${formatRetryTime(retryAfterMs)}.`;
    }

    if (attemptsRemaining <= 2) {
        return `${attemptsRemaining} intento${attemptsRemaining !== 1 ? 's' : ''} restante${attemptsRemaining !== 1 ? 's' : ''}.`;
    }

    return '';
}
