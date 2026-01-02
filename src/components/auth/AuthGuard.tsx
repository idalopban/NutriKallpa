"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { createBrowserClient } from "@/lib/supabase";
import { getUserProfileFromSupabase } from "@/lib/supabase-storage";
import { Activity } from "lucide-react";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * Client-side authentication guard component.
 * Verifies the session directly with Supabase to avoid LocalStorage dependency.
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const { user, isAuthenticated, setUser } = useAuthStore();
    const [isRevalidating, setIsRevalidating] = useState(!isAuthenticated);

    useEffect(() => {
        async function revalidateSession() {
            if (isAuthenticated && user) {
                setIsRevalidating(false);
                return;
            }

            try {
                // 1. Try Supabase OAuth session first
                const supabase = createBrowserClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // Fetch full profile from DB
                    const profile = await getUserProfileFromSupabase();
                    if (profile) {
                        setUser(profile);
                        setIsRevalidating(false);
                        return;
                    }
                }

                // 2. Try traditional session revalidation (cookie-based)
                // This is critical for when localStorage is cleared but HttpOnly cookie persists
                const { revalidateSession } = await import("@/actions/auth-actions");
                const result = await revalidateSession();

                if (result.success && result.user) {
                    setUser(result.user);
                }
            } catch (error) {
                console.error("Session revalidation failed:", error);
            } finally {
                setIsRevalidating(false);
            }
        }

        revalidateSession();
    }, [isAuthenticated, user, setUser]);

    // Show loading while checking/fetching session
    if (isRevalidating) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-50 dark:bg-[#0f172a]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 text-[#6cba00] animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Verificando sesión segura...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if still not authenticated after check
    if (!isAuthenticated) {
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
        return null;
    }

    return <>{children}</>;
}
