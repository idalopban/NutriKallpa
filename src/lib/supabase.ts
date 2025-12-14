import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.POSTGREST_URL?.replace('/rest/v1', '') || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.POSTGREST_API_KEY || '';

// Server-side Supabase client for auth operations
export function createSupabaseClient() {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            flowType: 'implicit',
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// Browser-side Supabase client (singleton to preserve PKCE verifier)
let browserClient: SupabaseClient | null = null;

export function createBrowserClient(): SupabaseClient {
    if (typeof window === 'undefined') {
        throw new Error('createBrowserClient should only be called on the client side');
    }

    if (!browserClient) {
        browserClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                detectSessionInUrl: false,
                flowType: 'pkce',
                persistSession: true,
                storageKey: 'nutrikallpa-auth',
            },
        });
    }

    return browserClient;
}

export { supabaseUrl, supabaseAnonKey };
