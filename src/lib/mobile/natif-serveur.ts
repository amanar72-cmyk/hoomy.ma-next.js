import { headers } from "next/headers";
import { userAgentEstNatif } from "./natif";

/**
 * Vrai si la requête provient de l'application native iOS.
 *
 * Utilisable dans les Server Components et les Server Actions : la coque
 * Capacitor ajoute sa signature au User-Agent de la WebView, donc l'information
 * remonte dans l'en-tête HTTP de CHAQUE requête, y compris la toute première.
 * Cela permet d'adapter le rendu côté serveur (masquer le bandeau
 * d'installation PWA, par exemple) sans attendre l'hydratation.
 */
export async function estAppNative(): Promise<boolean> {
  const enTetes = await headers();
  return userAgentEstNatif(enTetes.get("user-agent"));
}
