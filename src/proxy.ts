import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN - PROTECCIÓN DE RUTAS A NIVEL DE SERVIDOR
// ============================================================================
// Este middleware intercepta TODAS las peticiones antes de que lleguen al 
// cliente, garantizando que usuarios no autenticados no puedan acceder a
// rutas protegidas ni siquiera brevemente.
// ============================================================================

// Rutas públicas que NO requieren autenticación
const PUBLIC_ROUTES = [
    '/',           // Login page
    '/register',   // Registration page
    '/auth',       // OAuth callbacks
];

// Rutas de autenticación (redirigir a dashboard si ya está autenticado)
const AUTH_ROUTES = ['/', '/register'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // -------------------------------------------------------------------------
    // 1. PERMITIR RECURSOS ESTÁTICOS Y API
    // -------------------------------------------------------------------------
    if (
        pathname.startsWith('/_next') ||      // Next.js internals
        pathname.startsWith('/api') ||         // API routes
        pathname.startsWith('/models') ||      // 3D models
        pathname.includes('.') ||              // Static files (favicon.ico, images, etc.)
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // -------------------------------------------------------------------------
    // 2. VERIFICAR COOKIE DE SESIÓN
    // -------------------------------------------------------------------------
    // La cookie 'nutrikallpa-session' se establece al hacer login exitoso
    // y contiene el ID del usuario autenticado
    const sessionCookie = request.cookies.get('nutrikallpa-session');
    const isAuthenticated = !!sessionCookie?.value;

    // -------------------------------------------------------------------------
    // 3. DETERMINAR SI ES RUTA PÚBLICA
    // -------------------------------------------------------------------------
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    // -------------------------------------------------------------------------
    // 4. LÓGICA DE REDIRECCIÓN
    // -------------------------------------------------------------------------

    // Si NO está autenticado y trata de acceder a ruta protegida → Login
    if (!isAuthenticated && !isPublicRoute) {
        const loginUrl = new URL('/', request.url);
        // Guardar la URL original para redirigir después del login
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Si ESTÁ autenticado y trata de acceder a rutas de auth → Dashboard
    if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // -------------------------------------------------------------------------
    // 5. PERMITIR LA PETICIÓN
    // -------------------------------------------------------------------------
    return NextResponse.next();
}

// Configuración del matcher para optimizar rendimiento
// Solo ejecutar middleware en rutas que no sean recursos estáticos
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
