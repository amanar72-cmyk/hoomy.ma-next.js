"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NiveauBien } from "@/components/partage/CompositionNiveaux";
import { notifierNouveauBien } from "@/lib/email/notifications";

function normaliserPourSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function genererReference(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `HM-${num}`;
}

function genererSlug(titre: string, ville: string, reference: string): string {
  const base = `${normaliserPourSlug(titre)}-${normaliserPourSlug(ville)}`;
  const suffixe = reference.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `${base}-${suffixe}`;
}

export type DonneesBienClient = {
  transaction: string;
  type: string;
  ville: string;
  quartier: string;
  surface: number;
  chambres: number;
  salles_bain: number;
  equipements: string[];
  composition: NiveauBien[];
  photos: string[];
  photosOriginales: string[];
  titre: string;
  description: string;
  prix: number;
  latitude: number | null;
  longitude: number | null;
};

export async function publierBien(donnees: DonneesBienClient): Promise<{ id: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié — veuillez vous connecter.");

  const reference = genererReference();
  const slug = genererSlug(donnees.titre, donnees.ville, reference);

  const { data: bien, error } = await supabase
    .from("biens")
    .insert({
      reference,
      slug,
      titre: donnees.titre,
      description: donnees.description || null,
      type: donnees.type,
      transaction: donnees.transaction,
      prix: donnees.prix,
      ville: donnees.ville,
      quartier: donnees.quartier || null,
      latitude: donnees.latitude ?? null,
      longitude: donnees.longitude ?? null,
      chambres: donnees.chambres,
      salles_bain: donnees.salles_bain,
      surface: donnees.surface,
      equipements: donnees.equipements.length > 0 ? donnees.equipements : null,
      composition: donnees.composition.length > 0 ? donnees.composition : null,
      photos: donnees.photos.length > 0 ? donnees.photos : null,
      photos_originales: donnees.photosOriginales.length > 0 ? donnees.photosOriginales : null,
      verifie: false,
      proprietaire_id: user.id,
      date_soumission: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !bien) throw new Error(error?.message ?? "Erreur lors de la publication.");

  revalidatePath("/mon-compte/mes-biens");

  // Notification email best-effort — ne doit jamais faire échouer la publication.
  await notifierNouveauBien({
    titre: donnees.titre,
    ville: donnees.ville,
    prix: donnees.prix,
    transaction: donnees.transaction,
    reference,
    auteur: user.email ?? "Client HOOMY.MA",
  });

  return { id: bien.id };
}
