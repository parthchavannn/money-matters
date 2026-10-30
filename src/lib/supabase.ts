import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * `null` when no backend is configured — the app then runs local-only with no login.
 * PKCE keeps auth redirects in the query string, which doesn't collide with the hash router.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const cloudEnabled = supabase !== null;
