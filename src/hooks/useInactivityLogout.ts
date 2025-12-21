"use client";

/**
 * Inactivity Auto-Logout Hook
 * 
 * Monitors user activity and automatically logs out after a period of inactivity.
 * Default: 30 minutes (1800000ms)
 */

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Events that indicate user activity
const ACTIVITY_EVENTS = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click",
    "wheel"
];

export function useInactivityLogout(timeoutMs: number = INACTIVITY_TIMEOUT_MS) {
    const router = useRouter();
    const { isAuthenticated, logout } = useAuthStore();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const handleLogout = useCallback(async () => {
        console.log("[Security] Auto-logout due to inactivity");

        // Call server-side logout to ensure cookie is cleared
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Server logout failed:', e);
        }

        logout();
        router.push("/login?reason=inactivity");
    }, [logout, router]);

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (isAuthenticated) {
            timeoutRef.current = setTimeout(handleLogout, timeoutMs);
        }
    }, [isAuthenticated, handleLogout, timeoutMs]);

    useEffect(() => {
        if (!isAuthenticated) {
            // Clear any existing timers if not authenticated
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            return;
        }

        // Start the inactivity timer
        resetTimer();

        // Add event listeners for activity detection
        const handleActivity = () => {
            resetTimer();
        };

        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Also detect visibility change (user switching tabs)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Check if user was inactive for too long while away
                const inactiveTime = Date.now() - lastActivityRef.current;
                if (inactiveTime >= timeoutMs) {
                    handleLogout();
                } else {
                    resetTimer();
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isAuthenticated, resetTimer, handleLogout, timeoutMs]);

    return {
        resetTimer,
        lastActivityTime: lastActivityRef.current
    };
}
