import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sous-ensemble des types OTP email supportés par Supabase
type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

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

/**
 * `next` arrive de l'URL : sans contrôle, il devient une redirection ouverte.
 * Comme la destination est construite par concaténation (`base + next`), les
 * deux vecteurs qui sortent du domaine sont :
 *   "@evil.com"  → https://hoomy.ma@evil.com   (le @ fait passer hoomy.ma pour
 *                                               un identifiant → hôte evil.com)
 *   ".evil.com"  → https://hoomy.ma.evil.com   (sous-domaine de l'attaquant)
 * On n'accepte donc qu'un chemin interne : "/" suivi d'autre chose qu'un "/"
 * ou un "\" (qui rouvriraient une URL protocol-relative).
 */
function cheminInterne(next: string | null): string {
  const DEFAUT = '/mon-compte';
  if (!next || !next.startsWith('/')) return DEFAUT;
  if (next.startsWith('//') || next.startsWith('/\\')) return DEFAUT;
  return next;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as EmailOtpType | null;
  const next       = cheminInterne(searchParams.get('next'));

  const base     = baseUrl(request);
  const supabase = await createClient();

  // Flux PKCE OAuth — Google, etc. (code échangé contre une session)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // Flux Email OTP — confirmation d'inscription, magic link, reset password
  // Déclenché quand le template email pointe directement vers /auth/callback
  // avec ?token_hash=...&type=signup (ou magiclink, recovery, etc.)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/connexion?erreur=auth`);
}
