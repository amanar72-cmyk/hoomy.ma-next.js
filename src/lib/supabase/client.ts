import { createBrowserClient } from '@supabase/ssr';

// Client navigateur — usage dans les composants "use client"
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
