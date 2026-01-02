"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Heart, Loader2 } from "lucide-react";
import { registerUser } from "@/actions/auth-actions";
import { useAuthStore } from "@/store/useAuthStore";
import { createBrowserClient } from "@/lib/supabase";
import type { User } from "@/types";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        invitationCode: "",
        gdprConsent: false, // GDPR consent checkbox
    });

    const setUser = useAuthStore((state) => state.setUser);

    // Google OAuth state
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [googleInvitationCode, setGoogleInvitationCode] = useState("");
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // Handle Google Sign-In with invitation code (client-side)
    const handleGoogleRegister = async () => {
        if (!googleInvitationCode.trim()) {
            toast.error("Por favor ingresa el código de invitación");
            return;
        }

        setIsGoogleLoading(true);

        try {
            // Store invitation code in cookie for the callback to use
            document.cookie = `pending_invitation_code=${googleInvitationCode.trim().toUpperCase()}; path=/; max-age=600; SameSite=Lax`;

            // Start OAuth from the client side (this stores the PKCE verifier in localStorage)
            const supabase = createBrowserClient();
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) {
                console.error('OAuth error:', error);
                toast.error('Error al iniciar autenticación con Google');
                setIsGoogleLoading(false);
            }
            // If no error, the browser will redirect to Google
        } catch (err) {
            console.error('Google auth error:', err);
            toast.error('Error al conectar con Google');
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Validate password length client-side
            if (formData.password.length < 8) {
                toast.error("La contraseña debe tener al menos 8 caracteres");
                setIsLoading(false);
                return;
            }

            // Call secure server action (hashes password on server)
            const result = await registerUser({
                nombre: `${formData.nombre} ${formData.apellido}`,
                email: formData.email,
                password: formData.password,
                invitationCode: formData.invitationCode,
            });

            // Check for errors
            if (!result.success || result.error) {
                toast.error(result.error || "Error al crear la cuenta");
                setIsLoading(false);
                return;
            }

            // Success: Set user in auth store
            if (result.user) {
                const newUser: User = {
                    id: result.user.id,
                    email: result.user.email,
                    nombre: result.user.nombre,
                    rol: result.user.rol,
                    especialidad: result.user.especialidad,
                };

                setUser(newUser);
                // Set HTTP cookie for middleware authentication (server-side route protection)
                document.cookie = `nutrikallpa-session=${newUser.id}; path=/; max-age=604800; SameSite=Lax`;
                localStorage.setItem("nutrikallpa_authenticated", "true");

                toast.success("Cuenta creada exitosamente");

                setTimeout(() => {
                    router.push("/dashboard");
                }, 1000);
            }

        } catch (error) {
            console.error(error);
            toast.error("Error al crear la cuenta");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-screen-safe bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4 mobile-safe overflow-y-auto">
            <div className="w-full max-w-md space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#6cba00] to-[#ff8508] shadow-lg shadow-[#6cba00]/20 mb-4">
                        <Heart className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Únete a NutriKallpa
                    </h1>
                    <p className="text-muted-foreground">
                        Ingresa tu código de invitación para comenzar.
                    </p>
                </div>

                <Card className="border-0 shadow-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl ring-1 ring-gray-200 dark:ring-gray-700">
                    <CardHeader>
                        <CardTitle>Registro Profesional</CardTitle>
                        <CardDescription>Completa tus datos para crear tu cuenta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input
                                        id="nombre"
                                        placeholder="Juan"
                                        className="bg-white/50 dark:bg-gray-900/50"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apellido">Apellido</Label>
                                    <Input
                                        id="apellido"
                                        placeholder="Pérez"
                                        className="bg-white/50 dark:bg-gray-900/50"
                                        value={formData.apellido}
                                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="doctor@ejemplo.com"
                                    className="bg-white/50 dark:bg-gray-900/50"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="bg-white/50 dark:bg-gray-900/50"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label htmlFor="code" className="text-[#ff8508] font-semibold">Código de Invitación</Label>
                                <Input
                                    id="code"
                                    placeholder="ABCD-1234"
                                    className="font-mono uppercase tracking-widest border-orange-200 focus:border-[#ff8508] bg-orange-50/50 focus:ring-[#ff8508]"
                                    value={formData.invitationCode}
                                    onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Solicita este código al administrador del sistema.
                                </p>
                            </div>

                            {/* GDPR Consent Checkbox */}
                            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="gdpr-consent"
                                        checked={formData.gdprConsent}
                                        onChange={(e) => setFormData({ ...formData, gdprConsent: e.target.checked })}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6cba00] focus:ring-[#6cba00]"
                                        required
                                    />
                                    <label htmlFor="gdpr-consent" className="text-sm text-gray-600 dark:text-gray-400 leading-tight">
                                        Acepto el tratamiento de mis datos personales y de mis pacientes de acuerdo con la{" "}
                                        <a href="/privacy" className="text-[#ff8508] hover:underline font-medium">
                                            Política de Privacidad
                                        </a>
                                        . Entiendo que los datos de salud serán tratados con confidencialidad y de acuerdo con las regulaciones de protección de datos aplicables.
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500 pl-7">
                                    🔒 Cumplimos con GDPR y mejores prácticas de seguridad en salud.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-[#6cba00] to-[#ff8508] hover:from-[#5aa300] hover:to-[#e67600] shadow-lg shadow-[#ff8508]/20 transition-all hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
                                    </>
                                ) : (
                                    <>
                                        Crear Cuenta <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">o regístrate con</span>
                                </div>
                            </div>

                            {/* Google Sign-Up Button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                onClick={() => setShowGoogleModal(true)}
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Registrarse con Google
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    ¿Ya tienes cuenta?{" "}
                    <a href="/" className="font-semibold text-[#ff8508] hover:underline">
                        Iniciar Sesión
                    </a>
                </p>
            </div>

            {/* Google Registration Modal - Ask for invitation code first */}
            <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Registrarse con Google
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Ingresa tu código de invitación para continuar con el registro mediante Google
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="google-invitation-code" className="text-[#ff8508] font-semibold">
                                Código de Invitación
                            </Label>
                            <Input
                                id="google-invitation-code"
                                placeholder="ABCD-1234"
                                value={googleInvitationCode}
                                onChange={(e) => setGoogleInvitationCode(e.target.value.toUpperCase())}
                                className="text-center font-mono text-lg tracking-widest uppercase border-orange-200 focus:border-[#ff8508] bg-orange-50/50 focus:ring-[#ff8508]"
                            />
                            <p className="text-xs text-center text-gray-500">
                                Solicita este código al administrador del sistema
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        <Button
                            onClick={handleGoogleRegister}
                            disabled={!googleInvitationCode.trim()}
                            className="w-full bg-gradient-to-r from-[#6cba00] to-[#ff8508] hover:from-[#5aa300] hover:to-[#e67600]"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continuar con Google
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowGoogleModal(false);
                                setGoogleInvitationCode("");
                            }}
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
