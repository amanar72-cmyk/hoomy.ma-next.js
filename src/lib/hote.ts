import { headers } from "next/headers";

/**
 * Vrai si la requête vise le site public (hoomy.ma / www.hoomy.ma) et non le
 * back-office (pro.hoomy.ma).
 *
 * Même lecture d'en-têtes que le middleware : derrière le reverse proxy
 * Hostinger, "host" porte le nom interne — c'est x-forwarded-host qui porte le
 * domaine réellement demandé.
 *
 * Filtrer sur le hostname plutôt que sur le chemin ferme le trou de /connexion,
 * /inscription et /auth/*, qui sont servis sur pro.hoomy.ma sans commencer par
 * /pro ni /admin.
 */
export async function estSitePublic(): Promise<boolean> {
  const enTetes = await headers();
  const brut = enTetes.get("x-forwarded-host") || enTetes.get("host") || "";
  const hostname = brut.toLowerCase().replace(/:\d+$/, "");
  return !hostname.startsWith("pro.");
}
