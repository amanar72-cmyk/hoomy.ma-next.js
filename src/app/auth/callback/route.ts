import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// URL de base — résolution robuste derrière un reverse proxy (Hostinger, Vercel, etc.)
// Priorité : env var > X-Forwarded-Host header > origin de request.url (si externe)
function baseUrl(request: Request): string {
  // 1. Variable d'environnement explicite (à définir sur Hostinger)
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  // 2. Headers du reverse proxy Hostinger
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  // 3. Origin de request.url — valide seulement si ce n'est pas une adresse interne
  const { origin } = new URL(request.url);
  const interne = origin.includes('0.0.0.0') || origin.includes('localhost') || origin.includes('127.0.0.1');
  if (!interne) return origin;

  // 4. Fallback hardcodé — production HOOMY
  return 'https://hoomy.ma';
}

// Route handler OAuth — échange le code d'autorisation contre une session Supabase
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/mon-compte';

  const base = baseUrl(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/connexion?erreur=oauth`);
}
