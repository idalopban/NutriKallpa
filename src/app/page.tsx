'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, Users, TrendingUp, Heart, ArrowRight, CheckCircle2, ArrowLeft, Mail, KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types';
import { loginUser, sendRecoveryCode, verifyRecoveryCode, resetPassword, registerGoogleUser } from '@/actions/auth-actions';
import { createBrowserClient } from '@/lib/supabase';

// Lazy load LoginBackground - no bloquea LCP
const LoginBackground = dynamic(
  () => import('@/components/auth/LoginBackground').then(mod => mod.LoginBackground),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-slate-900" />
    )
  }
);

type RecoveryStep = 'EMAIL' | 'CODE' | 'PASSWORD';

// 1. Mover toda la lógica principal a este sub-componente
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Recovery Flow State
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('EMAIL');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Google OAuth State
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<{ email: string; name: string; photo: string } | null>(null);
  const [invitationCode, setInvitationCode] = useState('');

  const setUser = useAuthStore((state) => state.setUser);

  // Check for Google OAuth callback
  useEffect(() => {
    // FIRST: Check if OAuth token is in the URL hash (redirect from Supabase)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Redirect to auth callback page to handle the token
      window.location.href = '/auth/callback' + hash;
      return;
    }

    // Check if returning from Google OAuth as new user needing invitation
    const isNewGoogleUser = searchParams.get('google_new_user');
    if (isNewGoogleUser === 'true') {
      const googleEmail = searchParams.get('email') || '';
      const googleName = searchParams.get('name') || '';
      const googlePhoto = searchParams.get('photo') || '';

      setGoogleUserData({ email: googleEmail, name: googleName, photo: googlePhoto });
      setShowInvitationModal(true);

      // Clean URL
      window.history.replaceState({}, '', '/');
    }

    // Check for auth cookie from successful Google login
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('google_auth_user='));
    if (authCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        const userToLogin: User = {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          rol: userData.rol,
          especialidad: userData.especialidad,
          cmp: userData.cmp,
          telefono: userData.telefono,
          bio: userData.bio,
          photoUrl: userData.photoUrl,
          clinicName: userData.clinicName,
          clinicAddress: userData.clinicAddress,
          clinicPhone: userData.clinicPhone,
        };

        setUser(userToLogin);
        // Set HTTP cookie for middleware authentication (server-side route protection)
        document.cookie = `nutrikallpa-session=${userToLogin.id}; path=/; max-age=604800; SameSite=Lax`;
        localStorage.setItem('nutrikallpa_authenticated', 'true');

        // Clear the auth cookie
        document.cookie = 'google_auth_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

        toast.success(`Bienvenido, ${userToLogin.nombre}`);
        router.push('/dashboard');
      } catch (e) {
        console.error('Error parsing auth cookie:', e);
      }
    }
  }, [searchParams, setUser, router]);

  // Handle Google OAuth invitation submission
  const handleGoogleInvitationSubmit = async () => {
    if (!googleUserData || !invitationCode.trim()) {
      toast.error('Por favor ingresa el código de invitación');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerGoogleUser({
        nombre: googleUserData.name,
        email: googleUserData.email,
        photoUrl: googleUserData.photo,
        invitationCode: invitationCode.trim(),
      });

      if (result.success && result.user) {
        const userToLogin: User = {
          id: result.user.id,
          email: result.user.email,
          nombre: result.user.nombre,
          rol: result.user.rol,
          especialidad: result.user.especialidad,
          photoUrl: result.user.photoUrl,
        };

        setUser(userToLogin);
        // Set HTTP cookie for middleware authentication (server-side route protection)
        document.cookie = `nutrikallpa-session=${userToLogin.id}; path=/; max-age=604800; SameSite=Lax`;
        localStorage.setItem('nutrikallpa_authenticated', 'true');

        toast.success(`Bienvenido, ${userToLogin.nombre}`);
        setShowInvitationModal(false);
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Error al registrar');
      }
    } catch (error) {
      console.error('Google registration error:', error);
      toast.error('Error al registrar. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In button click (client-side)
  const handleGoogleSignIn = async () => {
    try {
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
      }
    } catch (err) {
      console.error('Google auth error:', err);
      toast.error('Error al conectar con Google');
    }
  };

  // =========================================================================
  // SECURE LOGIN HANDLER
  // =========================================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clear previous errors
      setLoginError('');

      // Validate inputs
      if (!email || !password) {
        setLoginError('Por favor ingrese email y contraseña');
        setIsLoading(false);
        return;
      }

      // Call secure server action
      const result = await loginUser(email, password);

      // CRITICAL: Check if login failed
      if (!result.success || result.error) {
        setLoginError(result.error || 'Credenciales inválidas');
        setIsLoading(false);
        return; // STOP EXECUTION HERE
      }

      // Only proceed if login succeeded
      if (result.user) {
        const userToLogin: User = {
          id: result.user.id,
          email: result.user.email,
          nombre: result.user.nombre,
          rol: result.user.rol,
          especialidad: result.user.especialidad,
          cmp: result.user.cmp,
          telefono: result.user.telefono,
          bio: result.user.bio,
          photoUrl: result.user.photoUrl,
          clinicName: result.user.clinicName,
          clinicAddress: result.user.clinicAddress,
          clinicPhone: result.user.clinicPhone,
          createdAt: result.user.createdAt,
        };

        // Save session using centralized store
        setUser(userToLogin);
        // Set HTTP cookie for middleware authentication (server-side route protection)
        document.cookie = `nutrikallpa-session=${userToLogin.id}; path=/; max-age=604800; SameSite=Lax`;
        localStorage.setItem('nutrikallpa_authenticated', 'true');

        toast.success(`Bienvenido, ${userToLogin.nombre}`);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (recoveryStep === 'EMAIL') {
        setRecoveryError(''); // Clear previous errors
        if (!email) {
          setRecoveryError('Por favor ingresa tu correo electrónico');
          setIsLoading(false);
          return;
        }
        const result = await sendRecoveryCode(email);
        console.log('[RECOVERY CLIENT] Result:', result);
        if (result.success) {
          toast.success(result.message);
          setRecoveryStep('CODE');
        } else {
          console.log('[RECOVERY CLIENT] Showing inline error:', result.message);
          setRecoveryError(result.message);
        }
      }
      else if (recoveryStep === 'CODE') {
        if (!recoveryCode || recoveryCode.length !== 6) {
          toast.error('Ingresa un código válido de 6 dígitos');
          setIsLoading(false);
          return;
        }
        const result = await verifyRecoveryCode(email, recoveryCode);
        if (result.success) {
          toast.success("Código verificado correctamente");
          setRecoveryStep('PASSWORD');
        } else {
          toast.error(result.message);
        }
      }
      else if (recoveryStep === 'PASSWORD') {
        if (newPassword !== confirmPassword) {
          toast.error("Las contraseñas no coinciden");
          setIsLoading(false);
          return;
        }
        if (newPassword.length < 8) {
          toast.error("La contraseña debe tener al menos 8 caracteres");
          setIsLoading(false);
          return;
        }

        const result = await resetPassword(email, newPassword);
        if (result.success) {
          toast.success("¡Contraseña actualizada! Ya puedes iniciar sesión.");
          // Reset flow logic
          setTimeout(() => {
            toggleRecovery();
            // Pre-fill email for login, keep password empty for security
            setPassword('');
          }, 1500);
        } else {
          toast.error(result.message);
        }
      }

    } catch (error) {
      console.error('Recovery error:', error);
      toast.error('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };



  const toggleRecovery = () => {
    setIsRecoveringPassword(!isRecoveringPassword);
    setRecoveryStep('EMAIL'); // Reset step
    setRecoveryCode('');
    setNewPassword('');
    setConfirmPassword('');
    // Mantener el email si ya lo escribió en el login
  };

  return (
    <div className="relative min-h-screen min-h-screen-safe flex flex-col mobile-safe overflow-x-hidden">
      <LoginBackground />
      <div className="container mx-auto px-4 py-4 md:py-8 flex-1 flex flex-col overflow-y-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center max-w-6xl mx-auto flex-1 pt-8 lg:pt-16">
          {/* Left Side - Hero Content */}
          <div className="space-y-12 lg:pr-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tighter drop-shadow-sm">
                Nutrición <br />
                Profesional <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6cba00] via-[#ff8508] to-[#6cba00] bg-[length:200%_auto] drop-shadow-lg">
                  Simplificada
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-zinc-300 max-w-lg leading-relaxed font-medium">
                La plataforma integral diseñada para nutricionistas modernos. Gestiona pacientes, realiza evaluaciones antropométricas precisas y optimiza tu práctica clínica.
              </p>
            </div>

            {/* Features Glass Grid */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              {[
                { icon: Users, title: "Gestión de Pacientes", desc: "Historial clínico digital completo", color: "text-[#6cba00]", bg: "bg-[#6cba00]/20" },
                { icon: Activity, title: "Antropometría", desc: "Cálculos de composición corporal", color: "text-[#c65d00]", bg: "bg-[#ff8508]/20" },
                { icon: TrendingUp, title: "Seguimiento", desc: "Gráficos de evolución detallados", color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/20" },
                { icon: Heart, title: "Planes Alimenticios", desc: "Diseño de dietas personalizadas", color: "text-red-500 dark:text-red-400", bg: "bg-red-500/20" }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 backdrop-blur-xl shadow-lg group hover:bg-white/80 dark:hover:bg-white/10 hover:scale-[1.02] transition-all duration-300">
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-all`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">{feature.title}</h2>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login/Recovery Form */}
          <div>
            <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/80 backdrop-blur-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden relative">
              {/* Form Content Wrapper with Transition */}
              <div className="relative w-full transition-all duration-500 ease-in-out">
                {!isRecoveringPassword ? (
                  /* LOGIN FORM */
                  <div>
                    <CardHeader className="space-y-1 pb-6">
                      <Image
                        src="/logo.svg"
                        alt="NutriKallpa Logo"
                        width={200}
                        height={70}
                        className="mx-auto mb-6 h-[72px] w-auto cursor-pointer transition-transform duration-300 hover:scale-110"
                        priority
                      />
                      <CardTitle className="text-2xl font-bold text-center">Bienvenido</CardTitle>
                      <CardDescription className="text-center">
                        Ingresa tus credenciales para acceder a tu panel
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="email">Correo Electrónico</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-11 bg-white/50 dark:bg-gray-900/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">Contraseña</Label>
                            <button
                              type="button"
                              onClick={toggleRecovery}
                              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline focus:outline-none transition-colors"
                            >
                              ¿Olvidaste tu contraseña?
                            </button>
                          </div>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setLoginError(''); // Clear error on input
                            }}
                            required
                            className={`h-11 bg-white/50 dark:bg-gray-900/50 ${loginError ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                              }`}
                          />
                          {/* Error Message */}
                          {loginError && (
                            <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                {loginError}
                              </p>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-[#6cba00] to-[#ff8508] hover:from-[#5aa300] hover:to-[#e67600] shadow-lg shadow-[#ff8508]/20 transition-all hover:scale-[1.02]"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <Activity className="w-4 h-4 animate-spin" /> Iniciando...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              Iniciar Sesión <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>

                        {/* Divider */}
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">o continúa con</span>
                          </div>
                        </div>

                        {/* Google Sign-In Button */}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                          onClick={handleGoogleSignIn}
                          disabled={isLoading}
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Continuar con Google
                        </Button>
                      </form>

                      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        ¿Aún no tienes cuenta? <Link href="/register" className="font-semibold text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:underline transition-colors">Regístrate aquí</Link>
                      </div>
                    </CardContent>
                  </div>
                ) : (
                  /* RECOVERY FORM */
                  <div>
                    <CardHeader className="space-y-1 pb-6">
                      <div className="flex items-center justify-start mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleRecovery}
                          className="pl-0 hover:bg-transparent hover:text-[#6cba00] -ml-2"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
                        </Button>
                      </div>
                      <Image
                        src="/logo.svg"
                        alt="NutriKallpa Logo"
                        width={200}
                        height={70}
                        className="mx-auto mb-6 h-[72px] w-auto cursor-pointer transition-transform duration-300 hover:scale-110"
                      />
                      <CardTitle className="text-2xl font-bold text-center">
                        {recoveryStep === 'EMAIL' && "Recuperar Contraseña"}
                        {recoveryStep === 'CODE' && "Verificar Código"}
                        {recoveryStep === 'PASSWORD' && "Nueva Contraseña"}
                      </CardTitle>
                      <CardDescription className="text-center">
                        {recoveryStep === 'EMAIL' && "Ingresa tu correo y te enviaremos un código."}
                        {recoveryStep === 'CODE' && <>Ingresa el código enviado a <span className="font-semibold text-[#6cba00]">{email}</span></>}
                        {recoveryStep === 'PASSWORD' && "Crea una nueva contraseña segura."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleRecoverySubmit} className="space-y-5">

                        {/* STEP 1: EMAIL */}
                        {recoveryStep === 'EMAIL' && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-right-8">
                            <Label htmlFor="recovery-email">Correo Electrónico</Label>
                            <Input
                              id="recovery-email"
                              type="email"
                              placeholder="nombre@ejemplo.com"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setRecoveryError(''); // Clear error on input
                              }}
                              required
                              className={`h-11 bg-white/50 dark:bg-gray-900/50 ${recoveryError ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                              autoFocus
                            />
                            {/* Inline Error Message */}
                            {recoveryError && (
                              <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  {recoveryError}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* STEP 2: CODE */}
                        {recoveryStep === 'CODE' && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-right-8">
                            <Label htmlFor="recovery-code">Código de Verificación</Label>
                            <div className="relative">
                              <Input
                                id="recovery-code"
                                type="text"
                                placeholder="123456"
                                value={recoveryCode}
                                onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                className="h-11 bg-white/50 dark:bg-gray-900/50 text-center text-2xl tracking-[0.5em]"
                                autoFocus
                              />
                              <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-2">
                              ¿No recibiste el código? <button type="button" onClick={() => setRecoveryStep('EMAIL')} className="text-[#c65d00] hover:underline">Reenviar</button>
                            </p>
                          </div>
                        )}

                        {/* STEP 3: PASSWORD */}
                        {recoveryStep === 'PASSWORD' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                            <div className="space-y-2">
                              <Label htmlFor="new-password">Nueva Contraseña</Label>
                              <div className="relative">
                                <Input
                                  id="new-password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  required
                                  className="h-11 bg-white/50 dark:bg-gray-900/50 pl-10"
                                  autoFocus
                                />
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                              <div className="relative">
                                <Input
                                  id="confirm-password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  required
                                  className="h-11 bg-white/50 dark:bg-gray-900/50 pl-10"
                                />
                                <CheckCircle2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-[#6cba00] to-[#ff8508] hover:from-[#5aa300] hover:to-[#e67600] shadow-lg shadow-[#ff8508]/20 transition-all hover:scale-[1.02]"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <Activity className="w-4 h-4 animate-spin" /> Procesando...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              {recoveryStep === 'EMAIL' && <>Enviar Código <Mail className="w-4 h-4" /></>}
                              {recoveryStep === 'CODE' && <>Verificar Código <ArrowRight className="w-4 h-4" /></>}
                              {recoveryStep === 'PASSWORD' && <>Cambiar Contraseña <CheckCircle2 className="w-4 h-4" /></>}
                            </span>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 NutriKallpa. Plataforma profesional para nutricionistas.</p>
        </footer>
      </div>

      {/* Google OAuth Invitation Code Modal */}
      <Dialog open={showInvitationModal} onOpenChange={setShowInvitationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Código de Invitación</DialogTitle>
            <DialogDescription className="text-center">
              Ingresa tu código de invitación para completar el registro con Google
            </DialogDescription>
          </DialogHeader>

          {googleUserData && (
            <div className="flex flex-col items-center gap-4 py-4">
              {googleUserData.photo && (
                <Image
                  src={googleUserData.photo}
                  alt="Google profile"
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-[#6cba00]"
                />
              )}
              <div className="text-center">
                <p className="font-medium text-gray-900 dark:text-white">{googleUserData.name}</p>
                <p className="text-sm text-gray-500">{googleUserData.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-code">Código de Invitación</Label>
              <Input
                id="invitation-code"
                placeholder="Ingresa tu código"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                className="text-center font-mono text-lg tracking-widest uppercase"
              />
            </div>

            <p className="text-xs text-center text-gray-500">
              Si no tienes un código, solicítalo a tu administrador
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={handleGoogleInvitationSubmit}
              disabled={isLoading || !invitationCode.trim()}
              className="w-full bg-gradient-to-r from-[#6cba00] to-[#ff8508] hover:from-[#5aa300] hover:to-[#e67600]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" /> Registrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Completar Registro <CheckCircle2 className="w-4 h-4" />
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowInvitationModal(false);
                setGoogleUserData(null);
                setInvitationCode('');
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

// 2. Componente Principal que Exportamos (Wrap con Suspense)
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-[#6cba00] animate-spin" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}