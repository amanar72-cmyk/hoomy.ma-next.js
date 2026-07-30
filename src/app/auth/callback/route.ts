import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sous-ensemble des types OTP email supportés par Supabase
type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

// URL de base — résolution robuste derrière un reverse proxy (Hostinger, Vercel, etc.)
// Priorité : env var > X-Forwarded-Host header > origin de request.url (si externe)
function baseUrl(request: Request): string {
  // 1. Domaine RÉELLEMENT demandé (x-forwarded-host derrière le proxy Hostinger).
  //    PRIORITAIRE : le cookie de session est posé sur ce domaine, la
  //    redirection DOIT y rester. Un agent qui arrive sur pro.hoomy.ma doit
  //    repartir sur pro.hoomy.ma — pas sur hoomy.ma (NEXT_PUBLIC_SITE_URL), où
  //    sa session n'existerait pas.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  // 2. Origin de request.url — valide seulement si ce n'est pas une adresse interne
  const { origin } = new URL(request.url);
  const interne = origin.includes('0.0.0.0') || origin.includes('localhost') || origin.includes('127.0.0.1');
  if (!interne) return origin;

  // 3. Repli : variable d'environnement, puis production HOOMY
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
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
    console.error('[auth/callback] exchangeCodeForSession échec :', error.status, error.message);
  }

  // Flux Email OTP — confirmation d'inscription, invitation, recovery, etc.
  // Déclenché quand le template email pointe directement vers /auth/callback
  // avec ?token_hash=...&type=invite (ou signup, recovery, magiclink…)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
    // Raison réelle loggée pour diagnostic (jeton expiré/consommé, type, etc.)
    console.error('[auth/callback] verifyOtp échec :', type, error.status, error.message);
  }

  if (!code && !token_hash) {
    console.error('[auth/callback] appelé sans code ni token_hash — lien mal formé ?');
  }

  return NextResponse.redirect(`${base}/connexion?erreur=auth`);
}
