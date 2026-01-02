"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Calendar,
    Utensils,
    Settings,
    LogOut,
    ShieldCheck,
    Scale
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

// ============================================
// CONFIGURATION
// ============================================
const SIDEBAR_GREEN = "#6cba00";

const navItems = [
    { name: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Agenda", icon: Calendar, href: "/agenda" },
    { name: "Pacientes", icon: Users, href: "/pacientes" },
    { name: "Antropometría", icon: Scale, href: "/antropometria" },
    { name: "Dietas", icon: Utensils, href: "/dietas" },
    { name: "Admin", icon: ShieldCheck, href: "/admin", adminOnly: true },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    // PERFORMANCE FIX: Use atomic selectors to prevent re-renders
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        logout();
        // Clear session cookie for middleware (iOS Safari compatible)
        document.cookie = 'nutrikallpa-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        // Clear ALL auth-related localStorage items
        localStorage.removeItem('nutrikallpa_authenticated');
        localStorage.removeItem('nutrikallpa-auth-storage'); // Zustand persist storage
        toast.success("Sesión cerrada correctamente");

        // Call server-side logout to ensure cookie is cleared
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Server logout failed:', e);
        }

        // Use full page reload to completely clear state
        window.location.href = '/';
    };

    const isActive = (href: string) => {
        return pathname === href || (href !== "/" && pathname.startsWith(href));
    };

    return (
        <aside
            className="hidden md:flex w-[90px] h-screen sticky top-0 flex-col items-center py-6 text-white transition-all duration-300 z-50 bg-sidebar"
        >
            {/* ========== LOGO (Icon Only) ========== */}
            <div className="mb-8 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm cursor-pointer transition-transform duration-300 hover:scale-110">
                    <Image
                        src="/logo.svg"
                        alt="NutriKallpa"
                        width={36}
                        height={36}
                        className="w-9 h-9"
                        priority
                    />
                </div>
                {/* Brand Name Text */}
                <div className="mt-3 text-center leading-tight">
                    <span className="block text-white font-bold text-sm">Nutri</span>
                    <span className="block text-white/90 font-bold text-sm">Kallpa</span>
                </div>
            </div>

            {/* ========== NAVIGATION ========== */}
            <nav className="flex-1 flex flex-col gap-4 w-full">
                {navItems.map((item) => {
                    if (item.adminOnly && user?.rol !== 'admin') return null;
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                        <div key={item.href} className="relative w-full">
                            <Link
                                href={item.href}
                                title={item.name}
                                className={cn(
                                    // BASE
                                    "flex items-center justify-center w-full h-[56px] transition-all relative z-10",

                                    active
                                        ? [
                                            // ACTIVE STATE - use semantic background to match page backgrounds
                                            "bg-background",
                                            // Text color
                                            "text-[#6cba00]",
                                            // Shape: Rounded left, Flat right
                                            "rounded-l-[20px] ml-3",
                                            // No shadow for seamless blend
                                        ].join(" ")
                                        : [
                                            // INACTIVE STATE
                                            "text-white/70 hover:text-white"
                                        ].join(" ")
                                )}
                            >
                                <Icon className={cn("w-6 h-6 transition-transform", active && "scale-110")} />
                            </Link>

                            {/* LIQUID CURVES (Only when active) */}
                            {active && (
                                <>
                                    {/* Top Curve */}
                                    <div className="absolute right-[-3px] -top-5 w-5 h-5 z-0 pointer-events-none overflow-hidden">
                                        <div className="w-full h-full bg-transparent rounded-br-full sidebar-curve-top" />
                                    </div>

                                    {/* Bottom Curve */}
                                    <div className="absolute right-[-3px] -bottom-5 w-5 h-5 z-0 pointer-events-none overflow-hidden">
                                        <div className="w-full h-full bg-transparent rounded-tr-full sidebar-curve-bottom" />
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* ========== FOOTER ========== */}
            <div className="flex flex-col gap-6 w-full items-center pb-4">
                {/* Settings */}
                <div className="relative w-full">
                    <Link
                        href="/settings"
                        title="Ajustes"
                        className={cn(
                            "flex items-center justify-center w-full h-[56px] transition-all relative z-10",
                            isActive("/settings")
                                ? "bg-background text-[#6cba00] rounded-l-[20px] ml-3"
                                : "text-white/70 hover:text-white"
                        )}
                    >
                        <Settings className="w-6 h-6" />
                    </Link>
                    {isActive("/settings") && (
                        <>
                            <div className="absolute right-[-3px] -top-5 w-5 h-5 z-0 pointer-events-none overflow-hidden">
                                <div className="w-full h-full bg-transparent rounded-br-full sidebar-curve-top" />
                            </div>
                            <div className="absolute right-[-3px] -bottom-5 w-5 h-5 z-0 pointer-events-none overflow-hidden">
                                <div className="w-full h-full bg-transparent rounded-tr-full sidebar-curve-bottom" />
                            </div>
                        </>
                    )}
                </div>

                {/* Divider */}
                <div className="w-10 h-[1px] bg-white/20" />

                {/* Profile / Logout */}
                <button
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all overflow-hidden border border-white/20"
                >
                    {/* Placeholder for User Avatar or Logout Icon */}
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {user?.nombre ? user.nombre.charAt(0).toUpperCase() : <LogOut className="w-4 h-4" />}
                    </div>
                </button>
            </div>
        </aside>
    );
}
