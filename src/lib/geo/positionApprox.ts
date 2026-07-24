import "server-only";

// Lecture des coordonnées EXACTES en service_role — jamais via la clé anon
// (voir audit sécurité : select("*") côté anon exposait latitude/longitude
// en clair via l'API REST Supabase, contournant le floutage applicatif).
// Le résultat est floué immédiatement (flouterPosition) ; les coordonnées
// exactes ne quittent jamais cette fonction.

import { createAdminClient } from "@/lib/supabase/admin";
import { flouterPosition } from "./floutage";
import type { PointCarte } from "@/lib/types";

/** Position floutée d'UN bien déjà validé/visible (detail pages). */
export async function obtenirPositionApprox(bienId: string): Promise<{ lat: number; lng: number } | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("biens").select("latitude, longitude").eq("id", bienId).maybeSingle();
  if (data?.latitude == null || data?.longitude == null) return null;
  return flouterPosition(bienId, data.latitude, data.longitude);
}

type BienPourCarte = {
  id: string;
  slug: string | null;
  titre: string;
  prix: number;
  transaction: string;
  photos: string[] | null;
};

/** Points de carte floutés pour une liste de biens DÉJÀ validés/visibles (list pages). */
export async function obtenirPointsCarteDepuisIds(biens: BienPourCarte[]): Promise<PointCarte[]> {
  if (biens.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("biens")
    .select("id, latitude, longitude")
    .in("id", biens.map((b) => b.id));

  const geoParId = new Map((data ?? []).map((d) => [d.id, d]));
  const points: PointCarte[] = [];
  for (const b of biens) {
    const geo = geoParId.get(b.id);
    if (geo?.latitude == null || geo?.longitude == null) continue;
    const pos = flouterPosition(b.id, geo.latitude, geo.longitude);
    if (!pos) continue;
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
