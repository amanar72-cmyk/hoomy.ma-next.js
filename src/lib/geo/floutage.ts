// Floutage des coordonnées — EXCLUSIVEMENT côté serveur.
//
// Les coordonnées exactes ne doivent JAMAIS être sérialisées vers le
// navigateur : le décalage est calculé ici, avant tout envoi au client.
// L'import "server-only" fait échouer le build si ce fichier est importé
// depuis un composant client (au lieu de fuiter silencieusement).
//
// Le décalage est dérivé de sha256(id + FLOUTAGE_SECRET) : stable pour un
// bien donné (la zone ne « saute » pas entre deux visites) mais impossible
// à inverser sans le secret — l'ancien algorithme dérivé de l'id seul était
// exposé dans les bundles client et donc réversible.

import "server-only";
import { createHash } from "node:crypto";

// ── Secret serveur ────────────────────────────────────────────────────────────

let alerteEmise = false;

// Fail-soft : un secret absent ne doit JAMAIS faire tomber les pages en 500.
// Sans secret, aucune coordonnée n'est produite (les cartes sont simplement
// désactivées) — on ne retombe jamais sur les coordonnées exactes.
function secretFloutage(): string | null {
  const s = process.env.FLOUTAGE_SECRET;
  if (!s && !alerteEmise) {
    alerteEmise = true;
    console.error(
      "[floutage] FLOUTAGE_SECRET manquant — cartes désactivées et coordonnées masquées. " +
      "Définir cette variable d'environnement sur l'hébergeur puis redémarrer."
    );
  }
  return s ?? null;
}

// ── Floutage ──────────────────────────────────────────────────────────────────

const RAYON_TERRE_M = 6371000;
const DISTANCE_MIN_M = 150;
const DISTANCE_MAX_M = 250;

/**
 * Décale une position de 150 à 250 m dans une direction stable pour un bien
 * donné. Arrondi à 5 décimales (~1 m) : transmettre plus de précision est inutile.
 * Renvoie null si FLOUTAGE_SECRET est absent (fail-soft, jamais de crash).
 */
export function flouterPosition(
  bienId: string,
  latitude: number,
  longitude: number
): { lat: number; lng: number } | null {
  const secret = secretFloutage();
  if (!secret) return null;

  const h = createHash("sha256").update(`${bienId}:${secret}`).digest();
  const angle = (h.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
  const distanceM =
    DISTANCE_MIN_M + (h.readUInt32BE(4) / 0xffffffff) * (DISTANCE_MAX_M - DISTANCE_MIN_M);

  const dLat = (distanceM / RAYON_TERRE_M) * (180 / Math.PI) * Math.cos(angle);
  const dLng =
    (distanceM / (RAYON_TERRE_M * Math.cos((latitude * Math.PI) / 180))) *
    (180 / Math.PI) *
    Math.sin(angle);

  return {
    lat: Number((latitude + dLat).toFixed(5)),
    lng: Number((longitude + dLng).toFixed(5)),
  };
}
