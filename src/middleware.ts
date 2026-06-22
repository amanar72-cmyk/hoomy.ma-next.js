import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Chemins qui restent accessibles tels quels sur pro.hoomy.ma (pas de rewrite vers /pro).
// Nécessaire pour que le redirect de ProLayout vers /connexion (quand non connecté)
// affiche bien la page de connexion publique plutôt qu'un 404 sur /pro/connexion.
const EXCLUSIONS_SOUS_DOMAINE = ['/connexion', '/inscription', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // Réécriture active uniquement si :
  //   · le host commence par "pro." (pro.hoomy.ma en prod)
  //   · le chemin n'est pas déjà sous /pro (évite la double réécriture)
  //   · le chemin n'est pas une page publique d'auth
  const doitReecrire =
    host.startsWith('pro.') &&
    !pathname.startsWith('/pro') &&
    !EXCLUSIONS_SOUS_DOMAINE.some(
      (c) => pathname === c || pathname.startsWith(c + '/')
    );

  // URL cible du rewrite calculée une seule fois
  const urlRewrite = doitReecrire
    ? (() => {
        const u = request.nextUrl.clone();
        // pro.hoomy.ma/ → /pro  |  pro.hoomy.ma/biens → /pro/biens
        u.pathname = '/pro' + (pathname === '/' ? '' : pathname);
        return u;
      })()
    : null;

  // Cette fonction crée la bonne réponse selon le contexte (next ou rewrite).
  // Elle est appelée ici ET dans le callback setAll de Supabase, car ce callback
  // recrée la réponse pour y attacher les cookies — il faut qu'il recrée la bonne.
  const creerReponse = (): NextResponse =>
    urlRewrite
      ? NextResponse.rewrite(urlRewrite, { request })
      : NextResponse.next({ request });

  // Réponse courante — peut être réassignée par setAll si Supabase rafraîchit le token
  let supabaseResponse = creerReponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Injecter les cookies dans la requête entrante (pour la suite du pipeline)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Recréer la réponse correcte (next ou rewrite) avec les nouveaux cookies
          supabaseResponse = creerReponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : ne pas supprimer — rafraîchit le token de session Supabase
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclut les fichiers statiques et les ressources Next.js internes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
