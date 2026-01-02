"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Moon, Sun, Monitor, User as UserIcon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export function SettingsDialog() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { logout } = useAuthStore();
    const router = useRouter();

    // FIX: Prevent Radix Portal from rendering before hydration to avoid DOM errors
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        logout();
        // Clear session cookie for middleware authentication
        document.cookie = 'nutrikallpa-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // Clear ALL auth-related localStorage items
        localStorage.removeItem('nutrikallpa_authenticated');
        localStorage.removeItem('nutrikallpa-auth-storage'); // Zustand persist storage

        // Call server-side logout to ensure cookie is cleared
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Server logout failed:', e);
        }

        // Use full page reload to completely clear state
        window.location.href = '/';
    };

    // Don't render Portal-based component until mounted
    if (!mounted) {
        return (
            <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-[#6cba00] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Settings className="w-5 h-5" />
            </button>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-[#6cba00] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 h-[46px] w-[46px] flex items-center justify-center group hover:scale-105 active:scale-95 outline-none">
                    <Settings className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configuración</DialogTitle>
                    <DialogDescription>
                        Personaliza tu experiencia en el dashboard.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <Label>Tema</Label>
                            <span className="text-xs text-muted-foreground">Selecciona tu preferencia de tema</span>
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            {/* Botón Claro */}
                            <button
                                type="button"
                                onClick={() => setTheme("light")}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors"
                                style={
                                    mounted && theme === "light"
                                        ? { backgroundColor: '#6cba00', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                        : { backgroundColor: 'transparent', color: '#475569' }
                                }
                            >
                                <Sun className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Claro</span>
                            </button>
                            {/* Botón Oscuro */}
                            <button
                                type="button"
                                onClick={() => setTheme("dark")}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors"
                                style={
                                    mounted && theme === "dark"
                                        ? { backgroundColor: '#ff8508', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                        : { backgroundColor: 'transparent', color: '#475569' }
                                }
                            >
                                <Moon className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Oscuro</span>
                            </button>
                            {/* Botón Sistema */}
                            <button
                                type="button"
                                onClick={() => setTheme("system")}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors"
                                style={
                                    mounted && (theme === "system" || theme === undefined)
                                        ? { backgroundColor: '#6cba00', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                        : { backgroundColor: 'transparent', color: '#475569' }
                                }
                            >
                                <Monitor className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Sistema</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <Label>Perfil</Label>
                            <span className="text-xs text-muted-foreground">Gestionar tu cuenta</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                                router.push("/settings/nutrition");
                            }}
                        >
                            <UserIcon className="w-4 h-4" />
                            Editar
                        </Button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex flex-col space-y-1">
                            <Label className="text-[var(--brand-orange)]">Cerrar Sesión</Label>
                        </div>
                        <Button size="sm" onClick={handleLogout} className="gap-2 bg-[var(--brand-orange)] hover:bg-[var(--brand-orange)]/90 text-white border-none">
                            <LogOut className="w-4 h-4" />
                            Salir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
