import { createAdminClient } from "@/lib/supabase/admin";

// Résout les URLs de photos à afficher pour un bien donné, côté serveur uniquement.
// - Bien validé (verifie=true)   : les URLs publiques (déjà nettes) → inchangé.
// - Bien non validé (verifie=false) : URLs SIGNÉES (5 min) pointant vers le bucket
//   privé "biens-prive", générées via service_role. N'appeler que depuis du code déjà
//   protégé par un contrôle de rôle/propriété (page admin, page agent assigné, page
//   propriétaire authentifié) — jamais depuis un contexte public/anonyme.
export async function urlsPhotosNettes(
  photos: string[] | null,
  photosOriginales: string[] | null,
  verifie: boolean
): Promise<string[]> {
  const publiques = photos ?? [];
  if (verifie) return publiques;

  const prives = photosOriginales ?? [];
  if (prives.length === 0) return publiques; // bien antérieur à cette fonctionnalité : repli sur la version publique

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("biens-prive")
    .createSignedUrls(prives, 300);

  if (error || !data) return publiques;

  return data.map((d, i) => d.signedUrl || publiques[i] || "");
}
