// API Route Handler - Set session cookie (not a server action)

import { NextRequest, NextResponse } from 'next/server';
import { setServerSession } from '@/lib/session-utils';

/**
 * API Route to set HttpOnly session cookie
 * 
 * This is needed because OAuth callback runs on the client and cannot
 * set HttpOnly cookies directly. This endpoint allows the client to
 * request that the server set the cookie properly.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid userId' },
                { status: 400 }
            );
        }

        // Set the HttpOnly session cookie using Next.js cookies() API
        await setServerSession(userId);

        console.log('[API] Session set for user:', userId.slice(0, 8) + '...');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Error setting session:', error);
        return NextResponse.json(
            { error: 'Failed to set session' },
            { status: 500 }
        );
    }
}
