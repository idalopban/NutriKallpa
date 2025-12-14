import { PostgrestClient } from "@supabase/postgrest-js";

const SUPABASE_URL = process.env.POSTGREST_URL || "";
const SUPABASE_ANON_KEY = process.env.POSTGREST_API_KEY || "";

export function createPostgrestClient() {
  // Supabase REST API endpoint
  const restUrl = SUPABASE_URL.endsWith('/rest/v1')
    ? SUPABASE_URL
    : `${SUPABASE_URL}/rest/v1`;

  const client = new PostgrestClient(restUrl, {
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  return client;
}

