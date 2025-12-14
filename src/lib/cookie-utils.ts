/**
 * Secure Cookie Utilities
 * 
 * Provides secure cookie handling with proper security flags.
 * Use these functions instead of directly manipulating document.cookie.
 */

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================

const COOKIE_NAME = 'nutrikallpa-session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Set a secure session cookie
 * @param userId - The user ID to store in the cookie
 */
export function setSessionCookie(userId: string): void {
    if (typeof window === 'undefined') return;

    const isProduction = process.env.NODE_ENV === 'production';

    // Build cookie string with security flags
    const cookieParts = [
        `${COOKIE_NAME}=${encodeURIComponent(userId)}`,
        `path=/`,
        `max-age=${COOKIE_MAX_AGE}`,
        `samesite=lax`, // Protects against CSRF while allowing normal navigation
    ];

    // Only add Secure flag in production (HTTPS required)
    if (isProduction) {
        cookieParts.push('secure');
    }

    // Note: HttpOnly cannot be set from JavaScript - must be set by server
    // For maximum security, session cookie should be set from server action

    document.cookie = cookieParts.join('; ');

    console.log('[COOKIE] Session cookie set with security flags');
}

/**
 * Get the current session cookie value
 * @returns The user ID from the cookie, or null if not found
 */
export function getSessionCookie(): string | null {
    if (typeof window === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === COOKIE_NAME) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

/**
 * Clear the session cookie (logout)
 */
export function clearSessionCookie(): void {
    if (typeof window === 'undefined') return;

    // Set cookie with past expiration to delete it
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    console.log('[COOKIE] Session cookie cleared');
}

/**
 * Check if session cookie exists
 * @returns true if session cookie exists
 */
export function hasSessionCookie(): boolean {
    return getSessionCookie() !== null;
}
