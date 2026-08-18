/**
 * Détection du contexte « application native iOS » (coque Capacitor).
 *
 * Ce fichier ne doit RIEN importer de `next/headers` : il est utilisé côté
 * client. La variante serveur vit dans `natif-serveur.ts`.
 */

/**
 * Signature ajoutée au User-Agent par la coque iOS.
 * Doit rester strictement identique à `appendUserAgent` dans capacitor.config.ts.
 */
export const SIGNATURE_APP_NATIVE = "HoomyProApp";

/** Vrai si la chaîne User-Agent fournie est celle de l'application native. */
export function userAgentEstNatif(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(SIGNATURE_APP_NATIVE);
}

/**
 * Vrai si le code s'exécute DANS l'application native.
 *
 * Deux tests plutôt qu'un : `window.Capacitor` est la source de vérité mais
 * n'est injectée qu'une fois le pont natif prêt. Le User-Agent, lui, est
 * disponible dès le premier octet — ce qui évite un flash d'interface web
 * pendant l'amorçage.
 */
export function estAppNative(): boolean {
  if (typeof window === "undefined") return false;

  const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (capacitor?.isNativePlatform?.()) return true;

  return userAgentEstNatif(window.navigator?.userAgent);
}
