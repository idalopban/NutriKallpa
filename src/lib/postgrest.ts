import { PostgrestClient } from "@supabase/postgrest-js";

/**
 * Creates a PostgREST client for Supabase database operations.
 * Environment variables are read at runtime for serverless compatibility.
 */
export function createPostgrestClient() {
  // Read environment variables at runtime (required for serverless)
  let SUPABASE_URL = process.env.POSTGREST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = process.env.POSTGREST_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Log what we have for debugging
  console.log('[PostgREST] URL value:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'EMPTY');
  console.log('[PostgREST] Key configured:', !!SUPABASE_ANON_KEY);

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[PostgREST] Missing configuration:', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY,
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('POSTGREST')).join(', ')
    });
    throw new Error('Database configuration is missing. Check POSTGREST_URL and POSTGREST_API_KEY environment variables.');
  }

  // Auto-fix: Add https:// if missing
  if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
    console.log('[PostgREST] Adding https:// prefix to URL');
    SUPABASE_URL = `https://${SUPABASE_URL}`;
  }

  // Supabase REST API endpoint
  const restUrl = SUPABASE_URL.endsWith('/rest/v1')
    ? SUPABASE_URL
    : `${SUPABASE_URL}/rest/v1`;

  console.log('[PostgREST] Final REST URL:', restUrl);

  try {
    const client = new PostgrestClient(restUrl, {
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    return client;
  } catch (error: any) {
    console.error('[PostgREST] Error creating client:', error?.message);
    throw error;
  }
}
