import { createClient } from '@supabase/supabase-js';

// Client Supabase avec la clé service_role — contourne toutes les RLS.
// À utiliser UNIQUEMENT dans des Server Actions ou Route Handlers.
// Ne jamais importer côté client ("use client").
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
