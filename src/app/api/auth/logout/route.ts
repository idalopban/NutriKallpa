import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Server-side logout endpoint.
 * This properly clears the session cookie from the server side.
 */
export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete the session cookie
        cookieStore.delete('nutrikallpa-session');

        // Return success with redirect instruction
        return NextResponse.json({
            success: true,
            message: 'Sesión cerrada correctamente'
        }, { status: 200 });
    } catch (error) {
        console.error('[LOGOUT] Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Error al cerrar sesión'
        }, { status: 500 });
    }
}

/**
 * Alternative: GET endpoint for simple redirect-based logout
 */
export async function GET() {
    const cookieStore = await cookies();

    // Delete the session cookie
    cookieStore.delete('nutrikallpa-session');

    // Redirect to login page
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
