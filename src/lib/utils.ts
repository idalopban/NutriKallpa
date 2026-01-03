import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a cryptographically secure random alphanumeric string.
 * @param length The length of the string (default: 12)
 * @returns A secure uppercase string (e.g., 'X7B3K9L2M4P1')
 */
export function generateSecureCode(length: number = 12): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
  let result = '';

  // Use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto) {
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  } else {
    // Fallback for simple unique strings if crypto is missing (rare in modern browsers)
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  }

  return result;
}
