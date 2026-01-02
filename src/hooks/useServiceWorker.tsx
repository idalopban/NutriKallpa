"use client";

/**
 * Service Worker Registration Hook
 * 
 * Registers the PWA service worker for offline support.
 * Should be called once in the root layout or main client component.
 */

import { useEffect, useState } from 'react';

interface ServiceWorkerState {
    isSupported: boolean;
    isRegistered: boolean;
    registration: ServiceWorkerRegistration | null;
    error: Error | null;
}

export function useServiceWorker(): ServiceWorkerState {
    const [state, setState] = useState<ServiceWorkerState>({
        isSupported: false,
        isRegistered: false,
        registration: null,
        error: null,
    });

    useEffect(() => {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            setState(prev => ({ ...prev, isSupported: false }));
            return;
        }

        setState(prev => ({ ...prev, isSupported: true }));

        // Register service worker
        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                });

                console.log('[SW] Service Worker registered successfully:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content is available, notify user
                                console.log('[SW] New content available, refresh to update');
                            }
                        });
                    }
                });

                setState({
                    isSupported: true,
                    isRegistered: true,
                    registration,
                    error: null,
                });
            } catch (error) {
                console.error('[SW] Registration failed:', error);
                setState(prev => ({
                    ...prev,
                    isRegistered: false,
                    error: error instanceof Error ? error : new Error('Unknown error'),
                }));
            }
        };

        // Only register in production or if explicitly enabled
        if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === 'true') {
            registerSW();
        } else {
            console.log('[SW] Service Worker disabled in development');
        }

        // Handle controller change (new SW took over)
        const handleControllerChange = () => {
            console.log('[SW] Controller changed, reloading page');
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    return state;
}

/**
 * Service Worker Registration Component
 * Mounts in root layout to initialize PWA
 */
export function ServiceWorkerRegistration() {
    useServiceWorker();
    return null;
}

export default ServiceWorkerRegistration;
