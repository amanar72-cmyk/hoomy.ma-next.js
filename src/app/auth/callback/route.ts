import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// URL de base fiable — env var prioritaire sur l'origin du reverse proxy
function baseUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL || origin;
}

// Route handler OAuth — échange le code d'autorisation contre une session Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/mon-compte';

  const base = baseUrl(origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // En cas d'erreur, redirige vers la page de connexion avec un paramètre d'erreur
  return NextResponse.redirect(`${base}/connexion?erreur=oauth`);
}
