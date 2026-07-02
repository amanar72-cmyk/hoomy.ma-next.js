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
import type { PointCarte } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Bien minimal géolocalisable (coordonnées exactes, en entrée uniquement). */
type BienGeolocalisable = {
  id: string;
  slug: string | null;
  titre: string;
  prix: number;
  transaction: string;
  photos: string[] | null;
  latitude: number | null;
  longitude: number | null;
};

// ── Secret serveur ────────────────────────────────────────────────────────────

function secretFloutage(): string {
  const s = process.env.FLOUTAGE_SECRET;
  if (!s) {
    throw new Error(
      "FLOUTAGE_SECRET manquant — variable d'environnement serveur requise " +
      "pour flouter les coordonnées (à définir dans .env.local et sur l'hébergeur)."
    );
  }
  return s;
}

// ── Floutage ──────────────────────────────────────────────────────────────────

const RAYON_TERRE_M = 6371000;
const DISTANCE_MIN_M = 150;
const DISTANCE_MAX_M = 250;

/**
 * Décale une position de 150 à 250 m dans une direction stable pour un bien
 * donné. Arrondi à 5 décimales (~1 m) : transmettre plus de précision est inutile.
 */
export function flouterPosition(
  bienId: string,
  latitude: number,
  longitude: number
): { lat: number; lng: number } {
  const h = createHash("sha256").update(`${bienId}:${secretFloutage()}`).digest();
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

/**
 * Construit les points de carte floutés à partir d'une liste de biens.
 * Les biens sans coordonnées sont exclus proprement (jamais de crash) —
 * le compteur du bouton « Afficher la carte » reflète donc le nombre
 * de biens réellement affichables.
 */
export function construirePointsCarte(biens: BienGeolocalisable[]): PointCarte[] {
  const points: PointCarte[] = [];
  for (const b of biens) {
    if (typeof b.latitude !== "number" || typeof b.longitude !== "number") continue;
    const pos = flouterPosition(b.id, b.latitude, b.longitude);
    points.push({
      id: b.id,
      slug: b.slug,
      titre: b.titre,
      prix: b.prix,
      transaction: b.transaction,
      photo: b.photos?.[0] ?? null,
      latApprox: pos.lat,
      lngApprox: pos.lng,
    });
  }
  return points;
}
