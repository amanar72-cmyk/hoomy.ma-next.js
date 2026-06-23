import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── Constantes ─────────────────────────────────────────────────────────────

// Chemins accessibles sans session sur pro.hoomy.ma (page de connexion, OAuth…)
const PUBLIQUES_PRO = ['/connexion', '/inscription', '/auth'];

// Rôles considérés comme "back-office agent"
const ROLES_AGENT = ['agent', 'agence'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extrait le hostname sans port (gère x-forwarded-host pour Vercel/proxy). */
function lireHostname(req: NextRequest): string {
  const raw =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    req.nextUrl.hostname;
  return raw.toLowerCase().replace(/:\d+$/, '');
}

/** Construit une URL de redirection vers le sous-domaine pro. */
function urlVersPro(req: NextRequest, hostname: string): URL {
  const url = req.nextUrl.clone();
  // En local (pro.localhost) on garde le protocol + port actuels
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    url.protocol = 'https:';
    url.port = '';
  }
  // "hoomy.ma" → "pro.hoomy.ma"  |  "www.hoomy.ma" → "pro.hoomy.ma"
  url.hostname = 'pro.' + hostname.replace(/^www\./, '');
  url.pathname = '/';
  url.search = '';
  return url;
}

/** Construit une URL de redirection vers le domaine principal. */
function urlVersPublic(req: NextRequest, hostname: string): URL {
  const url = req.nextUrl.clone();
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    url.protocol = 'https:';
    url.port = '';
  }
  url.hostname = hostname.replace(/^pro\./, '').replace(/^www\./, '');
  url.pathname = '/';
  url.search = '';
  return url;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = lireHostname(request);
  const estPro = hostname.startsWith('pro.');
  const estLocal = hostname === 'localhost' || hostname.startsWith('127.');

  // ── Rafraîchissement de session Supabase ─────────────────────────────────
  // supabaseResponse est la réponse "normale" (NextResponse.next).
  // Elle DOIT être retournée dans les cas pass-through pour propager les cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Injecte les nouveaux cookies dans la requête…
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // …puis recrée supabaseResponse pour les attacher à la réponse aussi
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : ne pas supprimer — rafraîchit le token de session Supabase
  const { data: { user } } = await supabase.auth.getUser();

  // ════════════════════════════════════════════════════════════════════════════
  // A. DOMAINE PRINCIPAL — hoomy.ma (site public uniquement)
  // ════════════════════════════════════════════════════════════════════════════
  if (!estPro) {
    // Bloquer /admin et /pro en production.
    // En local (localhost), ces routes restent accessibles directement pour le dev.
    if (!estLocal && (pathname.startsWith('/admin') || pathname.startsWith('/pro'))) {
      return NextResponse.redirect(urlVersPro(request, hostname));
    }

    // Site public : pass-through avec la session Supabase rafraîchie
    return supabaseResponse;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // B. SOUS-DOMAINE PRO — pro.hoomy.ma (back-office)
  // ════════════════════════════════════════════════════════════════════════════

  // B1. Routes publiques (connexion, auth OAuth…) → pass-through
  const estCheminPublic = PUBLIQUES_PRO.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (estCheminPublic) return supabaseResponse;

  // B2. Non connecté → page de connexion du sous-domaine
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    return NextResponse.redirect(url);
  }

  // B3. Chemin déjà sous /admin ou /pro → pass-through
  // Les layouts (AdminLayout, ProLayout) gèrent leur propre vérification de rôle.
  // C'est la seconde couche de sécurité — le middleware est la première.
  if (pathname.startsWith('/admin') || pathname.startsWith('/pro')) {
    return supabaseResponse;
  }

  // B4. Chemin inconnu sur pro.hoomy.ma (ex: "/", "/biens", "/acheter"…)
  // → Interroger le rôle et router vers le bon espace back-office.
  // Cette requête n'est déclenchée qu'une fois par session (la 1ʳᵉ visite
  // sur la racine "/" ou un chemin non-backoffice, ex: après un OAuth callback).
  const { data: profil } = await supabase
    .from('profils')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profil?.role ?? '';

  if (role === 'admin') {
    const dest = request.nextUrl.clone();
    dest.pathname = '/admin';
    return NextResponse.redirect(dest);
  }

  if (ROLES_AGENT.includes(role)) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/pro';
    return NextResponse.redirect(dest);
  }

  // Rôle client ou inconnu → pas d'accès au back-office, retour au site public
  return NextResponse.redirect(urlVersPublic(request, hostname));
}

// ─── Matcher ────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    // Couvre toutes les routes sauf les assets statiques Next.js et les images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
