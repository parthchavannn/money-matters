/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Leave unset to run in local-only mode. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon / publishable key (safe to ship; row-level security protects data). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
