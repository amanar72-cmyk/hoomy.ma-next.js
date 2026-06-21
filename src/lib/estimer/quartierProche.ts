import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuartierGeo = {
  nom: string;
  ville: string;
  latitude: number;
  longitude: number;
};

// ─── Formule de Haversine ─────────────────────────────────────────────────────
// Retourne la distance en kilomètres entre deux points GPS.

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon moyen de la Terre en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─── Détection du quartier le plus proche ────────────────────────────────────
// Prend la liste des quartiers (pré-chargée) et retourne le plus proche
// si sa distance est inférieure à distanceMaxKm.
// Appel pur et synchrone — pas de réseau.

export function trouverQuartierProche(
  lat: number,
  lng: number,
  quartiers: QuartierGeo[],
  distanceMaxKm = 5
): QuartierGeo | null {
  if (!quartiers.length) return null;

  let meilleur: QuartierGeo | null = null;
  let distMin = Infinity;

  for (const q of quartiers) {
    if (q.latitude == null || q.longitude == null) continue;
    const d = haversine(lat, lng, q.latitude, q.longitude);
    if (d < distMin) {
      distMin = d;
      meilleur = q;
    }
  }

  return distMin <= distanceMaxKm ? meilleur : null;
}

// ─── Chargement depuis Supabase ───────────────────────────────────────────────
// À appeler UNE SEULE FOIS au montage du composant.
// Erreurs silencieuses → retourne tableau vide, ne casse rien.

export async function chargerQuartiersGeo(): Promise<QuartierGeo[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("quartiers")
      .select("nom, ville, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    return (data ?? []) as QuartierGeo[];
  } catch {
    return [];
  }
}
