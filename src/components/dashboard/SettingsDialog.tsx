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
import { Settings, Moon, Sun, User as UserIcon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export function SettingsDialog() {
    const { theme, setTheme } = useTheme();
    const { logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        // Clear session cookie for middleware authentication
        document.cookie = 'nutrikallpa-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('nutrikallpa_authenticated');
        router.push("/");
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
                            <span className="text-xs text-muted-foreground">Cambiar entre modo claro y oscuro</span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        >
                            {theme === "light" ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>
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
