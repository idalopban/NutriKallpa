"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface MainLayoutClientProps {
    children: React.ReactNode;
}

/**
 * Client-side layout wrapper that includes authentication guard.
 * This ensures users are redirected to login if not authenticated.
 */
export function MainLayoutClient({ children }: MainLayoutClientProps) {
    return (
        <AuthGuard>
            <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f172a] gap-0 font-sans">
                <Sidebar />
                <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0f172a]">
                    <Header />
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
