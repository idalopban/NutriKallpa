import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client with service role key.
 * Environment variables are read at runtime for serverless compatibility.
 */
export function createSupabaseAdmin() {
    // Read environment variables at runtime (required for serverless like Vercel)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('[SupabaseAdmin] Missing configuration:', {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceRoleKey,
            envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
        });
        throw new Error('Missing Supabase URL or Service Role Key');
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
