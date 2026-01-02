'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { registerGoogleUser } from '@/actions/auth-actions';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { User } from '@/types';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setUser = useAuthStore((state) => state.setUser);
    const [status, setStatus] = useState('Procesando autenticación...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error in query params
                const error = searchParams.get('error');
                if (error) {
                    console.error('[AUTH] OAuth error:', error);
                    toast.error('Error de autenticación');
                    router.push('/?error=' + error);
                    return;
                }

                const supabase = createBrowserClient();

                // METHOD 1: Check for authorization code in query params (PKCE flow)
                const code = searchParams.get('code');
                if (code) {
                    console.log('[AUTH] Found authorization code, exchanging for session...');
                    setStatus('Intercambiando código de autorización...');

                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error('[AUTH] Code exchange error:', exchangeError);
                        toast.error('Error al procesar autenticación');
                        router.push('/?error=code_exchange_failed');
                        return;
                    }

                    if (data.session?.user) {
                        console.log('[AUTH] Session obtained successfully');
                        const user = data.session.user;
                        const email = user.email?.toLowerCase().trim() || '';
                        const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario';
                        const photo = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

                        await processUser(email, name, photo);
                        return;
                    }
                }

                // METHOD 2: Check for access token in URL hash (implicit flow)
                const hash = window.location.hash;
                if (hash && hash.includes('access_token')) {
                    console.log('[AUTH] Found access token in hash');
                    const hashParams = new URLSearchParams(hash.substring(1));
                    const accessToken = hashParams.get('access_token');

                    if (accessToken) {
                        setStatus('Verificando token...');

                        // Decode the JWT to get user info
                        try {
                            const payload = JSON.parse(atob(accessToken.split('.')[1]));
                            const email = payload.email?.toLowerCase().trim();
                            const name = payload.user_metadata?.full_name || payload.user_metadata?.name || 'Usuario';
                            const photo = payload.user_metadata?.avatar_url || payload.user_metadata?.picture || '';

                            if (email) {
                                await processUser(email, name, photo);
                                return;
                            }
                        } catch (decodeError) {
                            console.error('[AUTH] Error decoding token:', decodeError);
                        }
                    }
                }

                // METHOD 3: Try to get existing session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log('[AUTH] Found existing session');
                    const user = session.user;
                    const email = user.email?.toLowerCase().trim() || '';
                    const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario';
                    const photo = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

                    await processUser(email, name, photo);
                    return;
                }

                // No authentication found
                console.error('[AUTH] No authentication method succeeded');
                toast.error('No se encontró sesión de autenticación');
                router.push('/?error=no_session');

            } catch (err) {
                console.error('[AUTH] Callback error:', err);
                toast.error('Error procesando autenticación');
                router.push('/?error=callback_error');
            }
        };

        const processUser = async (email: string, name: string, photo: string) => {
            if (!email) {
                toast.error('No se pudo obtener el email');
                router.push('/?error=no_email');
                return;
            }

            setStatus('Verificando usuario...');

            try {
                // Check if user exists in our database
                const response = await fetch('/api/auth/check-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const result = await response.json();

                if (result.exists && result.user) {
                    // User exists - log them in
                    console.log('[AUTH] User exists, logging in...');
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
                    };

                    setUser(userToLogin);
                    // Set HttpOnly cookie via API route for server-side auth
                    await fetch('/api/auth/set-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userToLogin.id }),
                    });
                    localStorage.setItem('nutrikallpa_authenticated', 'true');

                    toast.success(`Bienvenido, ${userToLogin.nombre}`);
                    router.push('/dashboard');
                    return;
                }

                // New user - check for pending invitation code in cookie
                const pendingCode = getCookie('pending_invitation_code');
                console.log('[AUTH] New user, pending code:', pendingCode ? 'Found' : 'Not found');

                if (pendingCode) {
                    setStatus('Registrando con código de invitación...');

                    const registerResult = await registerGoogleUser({
                        nombre: name,
                        email: email,
                        photoUrl: photo,
                        invitationCode: pendingCode,
                    });

                    if (registerResult.success && registerResult.user) {
                        // Clear the cookie
                        document.cookie = 'pending_invitation_code=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

                        const userToLogin: User = {
                            id: registerResult.user.id,
                            email: registerResult.user.email,
                            nombre: registerResult.user.nombre,
                            rol: registerResult.user.rol,
                            especialidad: registerResult.user.especialidad,
                            photoUrl: registerResult.user.photoUrl,
                        };

                        setUser(userToLogin);
                        // Set HttpOnly cookie via API route for server-side auth
                        await fetch('/api/auth/set-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: userToLogin.id }),
                        });
                        localStorage.setItem('nutrikallpa_authenticated', 'true');

                        toast.success(`Bienvenido, ${userToLogin.nombre}`);
                        router.push('/dashboard');
                        return;
                    } else {
                        console.error('[AUTH] Registration failed:', registerResult.error);
                        toast.error(registerResult.error || 'Código de invitación inválido');
                    }
                }

                // No valid invitation code - redirect to ask for one
                console.log('[AUTH] Redirecting to request invitation code');
                router.push(
                    `/?google_new_user=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&photo=${encodeURIComponent(photo)}`
                );

            } catch (err) {
                console.error('[AUTH] User check error:', err);
                router.push(
                    `/?google_new_user=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&photo=${encodeURIComponent(photo)}`
                );
            }
        };

        // Helper to get cookie value
        const getCookie = (name: string): string | null => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
            return null;
        };

        handleCallback();
    }, [router, searchParams, setUser]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#6cba00] mx-auto" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{status}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Por favor espera...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#6cba00]" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
