"use client";

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
    const { theme, setTheme } = useTheme();
    const { logout } = useAuthStore();
    const router = useRouter();

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

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 text-[#6cba00] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Settings className="w-5 h-5" />
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
                        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                            <Button
                                variant={theme === "light" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setTheme("light")}
                                className={`gap-1.5 h-8 px-3 ${theme === "light" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                            >
                                <Sun className="h-3.5 w-3.5" />
                                <span className="text-xs">Claro</span>
                            </Button>
                            <Button
                                variant={theme === "dark" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setTheme("dark")}
                                className={`gap-1.5 h-8 px-3 ${theme === "dark" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                            >
                                <Moon className="h-3.5 w-3.5" />
                                <span className="text-xs">Oscuro</span>
                            </Button>
                            <Button
                                variant={theme === "system" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setTheme("system")}
                                className={`gap-1.5 h-8 px-3 ${theme === "system" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                            >
                                <Monitor className="h-3.5 w-3.5" />
                                <span className="text-xs">Sistema</span>
                            </Button>
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
                            Editar Perfil
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
