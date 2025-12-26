/**
 * Secure Storage Encryption Utilities
 * 
 * Provides AES encryption for sensitive medical data stored in localStorage.
 * Uses crypto-js for client-side encryption with a configurable key.
 * 
 * IMPORTANT: The encryption key should be set via environment variable
 * NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY in production.
 */

import CryptoJS from 'crypto-js';

// Default key for development - MUST be overridden in production
const DEFAULT_DEV_KEY = 'nutrikallpa_dev_key_2024_change_in_prod';

/**
 * Get the encryption key from environment or use default for dev
 */
function getEncryptionKey(): string {
    const envKey = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY || '')
        : '';

    if (envKey && envKey.length >= 16) {
        return envKey;
    }

    // Development fallback - log warning
    if (process.env.NODE_ENV === 'development') {
        console.warn('[SecureStorage] Using default encryption key. Set NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY in production.');
    }

    return DEFAULT_DEV_KEY;
}

/**
 * Encrypt data using AES-256
 * @param data - Any JSON-serializable data
 * @returns Encrypted string
 */
export function encryptData<T>(data: T): string {
    try {
        const jsonString = JSON.stringify(data);
        const key = getEncryptionKey();
        const encrypted = CryptoJS.AES.encrypt(jsonString, key);
        return encrypted.toString();
    } catch (error) {
        console.error('[SecureStorage] Encryption failed:', error);
        // Return empty encrypted string on error
        return CryptoJS.AES.encrypt('[]', getEncryptionKey()).toString();
    }
}

/**
 * Decrypt data using AES-256
 * @param encryptedData - Encrypted string from encryptData
 * @returns Decrypted data or empty array on failure
 */
export function decryptData<T>(encryptedData: string): T | null {
    try {
        if (!encryptedData) return null;

        const key = getEncryptionKey();
        const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
        const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

        if (!jsonString) {
            // Decryption failed - possibly wrong key or corrupted data
            return null;
        }

        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error('[SecureStorage] Decryption failed:', error);
        return null;
    }
}

/**
 * Check if a string appears to be encrypted (base64-like format)
 * Used for migration from unencrypted to encrypted storage
 */
export function isEncrypted(data: string): boolean {
    if (!data) return false;

    // Encrypted data from CryptoJS starts with "U2FsdGVkX1" (Salted__)
    // or is a valid base64 string without JSON characters
    if (data.startsWith('U2FsdGVkX1')) return true;

    // Check if it's valid JSON (unencrypted)
    try {
        JSON.parse(data);
        return false; // Valid JSON = not encrypted
    } catch {
        // Not valid JSON, might be encrypted or corrupted
        return data.length > 20 && !data.includes('{') && !data.includes('[');
    }
}

/**
 * Migrate unencrypted localStorage data to encrypted format
 * Called once on app initialization
 */
export function migrateToEncryptedStorage(key: string): void {
    if (typeof window === 'undefined') return;

    const rawData = localStorage.getItem(key);
    if (!rawData) return;

    // Check if already encrypted
    if (isEncrypted(rawData)) {
        return; // Already encrypted, skip migration
    }

    try {
        // Parse existing unencrypted data
        const data = JSON.parse(rawData);

        // Re-save as encrypted
        const encrypted = encryptData(data);
        localStorage.setItem(key, encrypted);

        console.log(`[SecureStorage] Migrated ${key} to encrypted storage`);
    } catch (error) {
        console.error(`[SecureStorage] Migration failed for ${key}:`, error);
    }
}

/**
 * Secure localStorage wrapper with automatic encryption/decryption
 */
export const secureStorage = {
    getItem<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;

        const rawData = localStorage.getItem(key);
        if (!rawData) return null;

        // Handle both encrypted and unencrypted data (for migration)
        if (isEncrypted(rawData)) {
            return decryptData<T>(rawData);
        } else {
            // Unencrypted legacy data - parse and migrate
            try {
                const data = JSON.parse(rawData) as T;
                // Migrate to encrypted on next save
                return data;
            } catch {
                return null;
            }
        }
    },

    setItem<T>(key: string, data: T): void {
        if (typeof window === 'undefined') return;

        const encrypted = encryptData(data);
        localStorage.setItem(key, encrypted);
    },

    removeItem(key: string): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
    }
};

export default secureStorage;
