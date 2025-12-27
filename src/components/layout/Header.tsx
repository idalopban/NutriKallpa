"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    Search, Menu, X,
    LayoutDashboard, Users, Calendar, Utensils, Scale, ShieldCheck, Settings, LogOut
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationsPopover } from "@/components/dashboard/NotificationsPopover";
import { SettingsDialog } from "@/components/dashboard/SettingsDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SIDEBAR_GREEN = "#6cba00";

const navItems = [
    { name: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Agenda", icon: Calendar, href: "/agenda" },
    { name: "Pacientes", icon: Users, href: "/pacientes" },
    { name: "Antropometría", icon: Scale, href: "/antropometria" },
    { name: "Dietas", icon: Utensils, href: "/dietas" },
    { name: "Ajustes", icon: Settings, href: "/settings" },
    { name: "Admin", icon: ShieldCheck, href: "/admin", adminOnly: true },
];

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    // PERFORMANCE FIX: Use atomic selectors to prevent re-renders
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const [searchTerm, setSearchTerm] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // FIX: Prevent Radix Portal from rendering before hydration to avoid removeChild errors
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Desactivado - ya no se muestra el buscador en el header
    const showSearch = false;

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchTerm.trim()) {
            router.push(`/pacientes?search=${encodeURIComponent(searchTerm)}`);
        }
    };

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
        <header className="flex items-center justify-between py-3 px-4 md:px-8 mb-2">
            {/* Mobile Menu Button - Only render Sheet after mount to prevent Portal DOM errors */}
            <div className="md:hidden">
                {mounted ? (
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0" style={{ backgroundColor: SIDEBAR_GREEN }}>
                            <SheetHeader className="p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm cursor-pointer transition-transform duration-300 hover:scale-110">
                                        <Image
                                            src="/logo.svg"
                                            alt="NutriKallpa"
                                            width={32}
                                            height={32}
                                            className="w-8 h-8"
                                            priority
                                        />
                                    </div>
                                    <SheetTitle className="text-white text-xl font-bold">NutriKallpa</SheetTitle>
                                </div>
                            </SheetHeader>

                            {/* Navigation */}
                            <nav className="flex-1 py-4">
                                {navItems.map((item) => {
                                    if (item.adminOnly && user?.rol !== 'admin') return null;
                                    const active = isActive(item.href);
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-6 py-4 transition-all",
                                                active
                                                    ? "bg-white text-[#6cba00] font-semibold"
                                                    : "text-white/80 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-base">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* User Info & Logout */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                        {user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate text-sm">{user?.nombre || "Usuario"}</p>
                                        <p className="text-white/60 text-xs truncate">{user?.especialidad || "Especialista"}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/10"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Cerrar Sesión
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    // Fallback button before Sheet mounts to prevent hydration mismatch
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                        <Menu className="h-6 w-6" />
                    </Button>
                )}
            </div>

            {/* Search (hidden by default) */}
            <div className="relative w-full max-w-md hidden md:block">
                {showSearch && (
                    <>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                            placeholder="Buscar pacientes..."
                            className="pl-10 bg-card border-none shadow-sm rounded-2xl h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </>
                )}
            </div>

            {/* Spacer for mobile */}
            <div className="flex-1 md:hidden" />

            {/* Right Controls */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Subscription Badge - Only show for non-admin users with expiration */}
                {mounted && user && user.rol !== 'admin' && user.subscriptionStatus !== 'unlimited' && user.subscriptionExpiresAt && (
                    (() => {
                        const expiresAt = new Date(user.subscriptionExpiresAt);
                        const now = new Date();
                        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft <= 0;
                        const isWarning = daysLeft > 0 && daysLeft <= 7;

                        return (
                            <div
                                className={cn(
                                    "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                    isExpired && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                    isWarning && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                    !isExpired && !isWarning && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                )}
                                title={`Suscripción ${isExpired ? 'expirada' : `válida hasta ${expiresAt.toLocaleDateString()}`}`}
                            >
                                <span className="text-xs">
                                    {isExpired ? '⚠️ Expirada' : isWarning ? `⏳ ${daysLeft}d` : `✓ ${daysLeft}d`}
                                </span>
                            </div>
                        );
                    })()
                )}
                {mounted && <ThemeToggle />}
                <NotificationsPopover />
                <SettingsDialog />
            </div>
        </header>
    );
}

