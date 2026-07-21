/**
 * Neutralise une recherche libre avant de l'interpoler dans un filtre
 * PostgREST `.or(...)` (ex. `titre.ilike.%${q}%,reference.ilike.%${q}%`).
 *
 * `,` sépare les conditions et `(`/`)` groupe la logique dans la syntaxe
 * `.or()` : un input contenant ces caractères peut ajouter ses propres
 * conditions (ex. `x,statut.eq.finalise`) au lieu de rester une simple
 * valeur recherchée. Testé contre PostgREST : le backslash-escaping
 * documenté casse le parseur (`failed to parse logic tree`) — on retire
 * donc ces caractères plutôt que de les échapper.
 */
export function nettoyerRecherche(valeur: string): string {
  return valeur.replace(/[,()]/g, "");
}
