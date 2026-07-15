// Consentement au dépôt de cookies de mesure d'audience (RGPD / loi 09-08).
//
// Stocké en cookie plutôt qu'en localStorage : le root layout le lit côté
// serveur, ce qui évite que le bandeau apparaisse brièvement chez quelqu'un
// qui a déjà répondu.

export const COOKIE_CONSENTEMENT = "hoomy_consentement";

/** Absence de cookie = choix pas encore fait → aucun script, bandeau affiché. */
export type Consentement = "accepte" | "refuse";

/** 6 mois — durée recommandée par la CNIL avant de redemander. */
const DUREE_JOURS = 180;

export function estConsentementValide(valeur: string | undefined): valeur is Consentement {
  return valeur === "accepte" || valeur === "refuse";
}

/** Client uniquement. Le refus est mémorisé comme l'acceptation : on ne redemande pas. */
export function ecrireConsentement(valeur: Consentement) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie =
    `${COOKIE_CONSENTEMENT}=${valeur}; path=/; max-age=${DUREE_JOURS * 24 * 60 * 60}; samesite=lax${secure}`;
}
