"use client";

/**
 * Subscription Guard Hook
 * 
 * Validates user subscription status with offline support.
 * Uses encrypted localStorage to cache subscription info for offline access.
 * 
 * Features:
 * - Online: Verifies subscription from Supabase
 * - Offline: Uses cached subscription with grace period
 * - Grace Period: 7 days after expiration before hard block
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { secureStorage } from '@/lib/secure-storage';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'blocked' | 'loading' | 'error';

export interface SubscriptionInfo {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    expiresAt: string | null;          // ISO date string
    lastVerifiedAt: string | null;     // Last online verification
    gracePeriodDays: number;
    daysRemaining: number | null;
    daysInGracePeriod: number | null;
    isOffline: boolean;
    canAccessPremiumFeatures: boolean;
    message: string;
}

interface CachedSubscription {
    tier: SubscriptionTier;
    expiresAt: string;
    lastVerifiedAt: string;
    userId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'nutrikallpa_subscription_v1';
const GRACE_PERIOD_DAYS = 7;
const VERIFICATION_INTERVAL_MS = 1000 * 60 * 30; // 30 minutes

// Features available per tier
export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
    free: [
        'Hasta 5 pacientes',
        'Evaluaciones básicas',
        'Generador de dietas limitado'
    ],
    basic: [
        'Hasta 50 pacientes',
        'Todas las evaluaciones ISAK',
        'Generador de dietas completo',
        'Exportación PDF'
    ],
    professional: [
        'Pacientes ilimitados',
        'Modelo 5 componentes Kerr',
        'Somatotipo Heath-Carter',
        'Nutrición deportiva',
        'Soporte prioritario'
    ],
    enterprise: [
        'Todo en Professional',
        'Multi-usuario (equipo)',
        'API access',
        'White-label',
        'Soporte 24/7'
    ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDaysRemaining(expiresAt: string): number {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getCachedSubscription(): CachedSubscription | null {
    return secureStorage.getItem<CachedSubscription>(STORAGE_KEY);
}

function setCachedSubscription(sub: CachedSubscription): void {
    secureStorage.setItem(STORAGE_KEY, sub);
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSubscriptionGuard(userId: string | null): SubscriptionInfo {
    const [subscription, setSubscription] = useState<SubscriptionInfo>({
        tier: 'free',
        status: 'loading',
        expiresAt: null,
        lastVerifiedAt: null,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        daysRemaining: null,
        daysInGracePeriod: null,
        isOffline: false,
        canAccessPremiumFeatures: false,
        message: 'Verificando suscripción...'
    });

    // Check subscription from Supabase (online)
    const verifyOnline = useCallback(async (): Promise<CachedSubscription | null> => {
        if (!userId) return null;

        try {
            // Dynamic import to avoid SSR issues
            const { createBrowserClient } = await import('@/lib/supabase');
            const supabase = createBrowserClient();

            const { data, error } = await supabase
                .from('subscriptions')
                .select('tier, expires_at, status')
                .eq('user_id', userId)
                .single();

            if (error) {
                // If no subscription found, user is on free tier
                if (error.code === 'PGRST116') {
                    const freeSubscription: CachedSubscription = {
                        tier: 'free',
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                        lastVerifiedAt: new Date().toISOString(),
                        userId
                    };
                    setCachedSubscription(freeSubscription);
                    return freeSubscription;
                }
                throw error;
            }

            const subscription: CachedSubscription = {
                tier: data.tier as SubscriptionTier,
                expiresAt: data.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                lastVerifiedAt: new Date().toISOString(),
                userId
            };

            // Cache the result for offline use
            setCachedSubscription(subscription);

            return subscription;
        } catch (error) {
            console.error('[Subscription] Online verification failed:', error);
            // Return cached data if available
            return getCachedSubscription();
        }
    }, [userId]);

    // Evaluate subscription status
    const evaluateSubscription = useCallback((cached: CachedSubscription | null, offline: boolean): SubscriptionInfo => {
        // No subscription found
        if (!cached) {
            return {
                tier: 'free',
                status: 'active',
                expiresAt: null,
                lastVerifiedAt: null,
                gracePeriodDays: GRACE_PERIOD_DAYS,
                daysRemaining: null,
                daysInGracePeriod: null,
                isOffline: offline,
                canAccessPremiumFeatures: false,
                message: 'Plan gratuito activo'
            };
        }

        const daysRemaining = calculateDaysRemaining(cached.expiresAt);
        const isExpired = daysRemaining < 0;
        const daysInGracePeriod = isExpired ? Math.abs(daysRemaining) : null;
        const gracePeriodExceeded = daysInGracePeriod !== null && daysInGracePeriod > GRACE_PERIOD_DAYS;

        // Determine status
        let status: SubscriptionStatus;
        let message: string;
        let canAccessPremiumFeatures: boolean;

        if (!isExpired) {
            status = 'active';
            message = `Plan ${cached.tier} activo. ${daysRemaining} días restantes.`;
            canAccessPremiumFeatures = cached.tier !== 'free';
        } else if (!gracePeriodExceeded) {
            status = 'grace_period';
            message = `⚠️ Tu suscripción venció hace ${daysInGracePeriod} días. Renueva pronto.`;
            canAccessPremiumFeatures = cached.tier !== 'free'; // Still allow access during grace
        } else {
            status = 'blocked';
            message = '❌ Tu suscripción ha expirado. Renueva para continuar.';
            canAccessPremiumFeatures = false;
        }

        // Add offline indicator
        if (offline) {
            message = `📴 Modo offline - ${message}`;
        }

        return {
            tier: gracePeriodExceeded ? 'free' : cached.tier,
            status,
            expiresAt: cached.expiresAt,
            lastVerifiedAt: cached.lastVerifiedAt,
            gracePeriodDays: GRACE_PERIOD_DAYS,
            daysRemaining: isExpired ? 0 : daysRemaining,
            daysInGracePeriod,
            isOffline: offline,
            canAccessPremiumFeatures,
            message
        };
    }, []);

    // Main effect: verify subscription
    useEffect(() => {
        if (!userId) {
            setSubscription(prev => ({
                ...prev,
                status: 'active',
                tier: 'free',
                message: 'Plan gratuito activo'
            }));
            return;
        }

        const verify = async () => {
            const offline = !isOnline();
            const cached = getCachedSubscription();

            // If offline, use cached data
            if (offline) {
                const result = evaluateSubscription(cached, true);
                setSubscription(result);
                return;
            }

            // Online: verify with server
            const serverData = await verifyOnline();
            const result = evaluateSubscription(serverData || cached, false);
            setSubscription(result);
        };

        // Initial verification
        verify();

        // Set up periodic verification (only when online)
        const interval = setInterval(() => {
            if (isOnline()) {
                verify();
            }
        }, VERIFICATION_INTERVAL_MS);

        // Listen for online/offline events
        const handleOnline = () => verify();
        const handleOffline = () => {
            const cached = getCachedSubscription();
            setSubscription(evaluateSubscription(cached, true));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [userId, verifyOnline, evaluateSubscription]);

    return subscription;
}

// ============================================================================
// FEATURE GUARD
// ============================================================================

/**
 * Check if a specific feature is available for the current subscription
 */
export function useFeatureAccess(
    subscription: SubscriptionInfo,
    requiredTier: SubscriptionTier
): { hasAccess: boolean; reason: string | null } {
    return useMemo(() => {
        const tierOrder: SubscriptionTier[] = ['free', 'basic', 'professional', 'enterprise'];
        const currentIndex = tierOrder.indexOf(subscription.tier);
        const requiredIndex = tierOrder.indexOf(requiredTier);

        if (subscription.status === 'blocked') {
            return { hasAccess: false, reason: 'Suscripción expirada' };
        }

        if (currentIndex >= requiredIndex) {
            return { hasAccess: true, reason: null };
        }

        return {
            hasAccess: false,
            reason: `Requiere plan ${requiredTier} o superior`
        };
    }, [subscription, requiredTier]);
}

// ============================================================================
// PATIENT LIMIT GUARD
// ============================================================================

const PATIENT_LIMITS: Record<SubscriptionTier, number> = {
    free: 5,
    basic: 50,
    professional: Infinity,
    enterprise: Infinity
};

export function usePatientLimit(subscription: SubscriptionInfo, currentPatientCount: number) {
    return useMemo(() => {
        const limit = PATIENT_LIMITS[subscription.tier];
        const remaining = limit - currentPatientCount;
        const canAddMore = remaining > 0 || limit === Infinity;

        return {
            limit: limit === Infinity ? 'Ilimitado' : limit,
            currentCount: currentPatientCount,
            remaining: limit === Infinity ? 'Ilimitado' : Math.max(0, remaining),
            canAddMore,
            message: canAddMore
                ? null
                : `Has alcanzado el límite de ${limit} pacientes. Actualiza tu plan.`
        };
    }, [subscription.tier, currentPatientCount]);
}

export default useSubscriptionGuard;
