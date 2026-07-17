// Émission d'événements Meta Pixel — helper client partagé (ViewContent, Lead).
//
// NE CHARGE PAS le pixel : le script de base vit dans
// src/components/analytique/ScriptsTracking.tsx, monté UNIQUEMENT après
// consentement. window.fbq n'existe donc que si l'utilisateur a accepté le
// bandeau ; la garde ci-dessous rend chaque événement automatiquement
// consent-gated. Si fbq est absent (refus, ou pixel non configuré), l'appel
// est simplement ignoré — jamais d'erreur.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const DEVISE = "MAD";

/** Paramètres Meta pour un bien immobilier (ViewContent, Lead). */
export type ParamsBienMeta = {
  reference: string;      // HM-XXXX — clé unique Pixel + futur catalogue
  titre: string;
  prix: number;
};

/** Construit le payload standard d'un bien (content_ids = référence, jamais l'uuid). */
export function payloadBien(bien: ParamsBienMeta): Record<string, unknown> {
  return {
    content_ids: [bien.reference],
    content_type: "home_listing",
    content_name: bien.titre,
    value: bien.prix,
    currency: DEVISE,
  };
}

/** Tir générique, protégé par la présence de fbq (donc du consentement). */
export function trackMeta(evenement: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", evenement, params);
}
