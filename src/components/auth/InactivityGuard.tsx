"use client";

/**
 * InactivityGuard
 * 
 * Wrapper component that monitors user inactivity and auto-logs out.
 * Should wrap the main app content.
 */

import { useInactivityLogout } from "@/hooks/useInactivityLogout";

interface InactivityGuardProps {
    children: React.ReactNode;
    timeoutMinutes?: number;
}

export function InactivityGuard({ children, timeoutMinutes = 30 }: InactivityGuardProps) {
    // Use the inactivity logout hook
    useInactivityLogout(timeoutMinutes * 60 * 1000);

    return <>{children}</>;
}
