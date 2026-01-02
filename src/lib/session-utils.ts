/**
 * Server-Side Session Utilities
 * 
 * Provides secure session management with HttpOnly cookies.
 * These functions should only be used in server actions or middleware.
 */

import { cookies } from 'next/headers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SESSION_COOKIE_NAME = 'nutrikallpa-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ============================================================================
// SERVER-SIDE SESSION FUNCTIONS
// ============================================================================

/**
 * Set a secure HttpOnly session cookie (server-side only)
 * @param userId - The user ID to store in the session
 */
export async function setServerSession(userId: string): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, userId, {
        httpOnly: true,           // Not accessible via JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
        sameSite: 'lax',          // CSRF protection
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });

    console.log('[SESSION] Server session created for user:', userId.slice(0, 8) + '...');
}

/**
 * Get the current session user ID (server-side only)
 * @returns The user ID from the session, or null if not found
 */
export async function getServerSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    return sessionCookie?.value || null;
}

/**
 * Clear the server session (logout)
 */
export async function clearServerSession(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete(SESSION_COOKIE_NAME);

    console.log('[SESSION] Server session cleared');
}

/**
 * Check if a valid session exists
 * @returns true if session exists
 */
export async function hasServerSession(): Promise<boolean> {
    const session = await getServerSession();
    return session !== null;
}

/**
 * Refresh session (extend expiration)
 * @param userId - The user ID to refresh
 */
export async function refreshServerSession(userId: string): Promise<void> {
    await setServerSession(userId);
    console.log('[SESSION] Session refreshed');
}
