// Émission d'événements Meta Pixel — helper client partagé (ViewContent, Lead).
//
// NE CHARGE PAS le pixel : le script de base vit dans
// src/components/analytique/ScriptsTracking.tsx, monté UNIQUEMENT après
// consentement. window.fbq n'existe donc que si l'utilisateur a accepté le
// bandeau. Si fbq est absent (consentement pas encore donné, script en cours
// de chargement, refus, ou pixel non configuré), l'événement est gardé en
// mémoire et ne part que si le pixel se charge — sinon il disparaît avec la
// page. Jamais d'erreur.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    /**
     * File d'attente en mémoire des événements émis avant que fbq existe.
     * Vidée par le script d'init du pixel (ScriptsTracking) — donc UNIQUEMENT
     * après consentement. En cas de refus, elle n'est jamais envoyée et
     * disparaît avec la page : rien ne sort du navigateur.
     */
    __fileMeta?: Array<[string, Record<string, unknown> | undefined]>;
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

/**
 * Tir générique. Si fbq existe, l'événement part tout de suite ; sinon il est
 * mis en file d'attente en mémoire.
 *
 * Pourquoi une file : sur une fiche bien, MetaViewContent tire au montage,
 * AVANT que le script d'init du pixel (strategy="afterInteractive") ait créé
 * fbq — l'événement était donc perdu à chaque fois, même chez un visiteur
 * ayant déjà accepté. Idem pour un visiteur qui accepte le bandeau après être
 * arrivé sur la fiche. Le script d'init vide la file juste après fbq('init').
 *
 * Le consentement reste garanti : la file n'est vidée que par ScriptsTracking,
 * qui n'est monté qu'après acceptation.
 */
export function trackMeta(evenement: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (window.fbq) {
    window.fbq("track", evenement, params);
    return;
  }
  (window.__fileMeta ??= []).push([evenement, params]);
}
