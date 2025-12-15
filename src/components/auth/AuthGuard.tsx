"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Activity } from "lucide-react";

interface AuthGuardProps {
    children: React.ReactNode;
}

// Subscribe to Zustand persist hydration
const emptySubscribe = () => () => { };

/**
 * Client-side authentication guard component.
 * Redirects to login page if user is not authenticated.
 * This ensures users are redirected even during client-side navigation.
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    // Track hydration using useSyncExternalStore for SSR safety
    const isHydrated = useSyncExternalStore(
        emptySubscribe,
        () => true,  // Client: always hydrated after first render
        () => false  // Server: never hydrated
    );

    const [hasChecked, setHasChecked] = useState(false);

    // Wait a tick for Zustand to fully hydrate from localStorage
    useEffect(() => {
        const timer = setTimeout(() => {
            setHasChecked(true);
        }, 150); // Small delay to ensure localStorage data is loaded
        return () => clearTimeout(timer);
    }, []);

    // Redirect to login if not authenticated (after hydration check)
    useEffect(() => {
        if (hasChecked && isHydrated && !isAuthenticated) {
            // Only redirect, don't clear localStorage (that's for logout only)
            window.location.href = '/';
        }
    }, [hasChecked, isHydrated, isAuthenticated]);

    // Show loading while checking auth state
    if (!isHydrated || !hasChecked) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-50 dark:bg-[#0f172a]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 text-[#6cba00] animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    // If not authenticated after check, return null (redirect will happen)
    if (!isAuthenticated || !user) {
        return null;
    }

    // User is authenticated, render children
    return <>{children}</>;
}
