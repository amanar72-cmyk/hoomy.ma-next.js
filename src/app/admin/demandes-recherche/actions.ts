"use server";

// Modération des demandes de recherche + gestion des propositions reçues.
// Réservé admin — même garde que src/app/admin/leads/actions.ts.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { StatutProposition } from "@/lib/demandes/types";

async function exigerAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") throw new Error("Accès refusé.");
}

/**
 * Publie une demande — seul moment où statut passe à 'publiee'. Le trigger
 * proteger_statut_demande_recherche() autorise ce changement car l'appelant
 * (session admin authentifiée) satisfait is_admin().
 */
export async function publierDemandeRecherche(id: string): Promise<void> {
  await exigerAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("demandes_recherche")
    .update({ statut: "publiee", publiee_le: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/demandes-recherche");
  revalidatePath(`/admin/demandes-recherche/${id}`);
  revalidatePath("/demandes");
}

export async function refuserDemandeRecherche(id: string, motif: string): Promise<void> {
  await exigerAdmin();
  const motifPropre = motif.trim();
  if (!motifPropre) throw new Error("Un motif de refus est requis.");
  const supabase = await createClient();

  // Motif AJOUTÉ (pas de colonne dédiée dans le schéma validé) sans écraser
  // les critères déjà saisis par le client.
  const { data: existante } = await supabase
    .from("demandes_recherche")
    .select("criteres_supplementaires")
    .eq("id", id)
    .maybeSingle();
  const noteRefus = `[Refusée] ${motifPropre}`;
  const criteresMaj = existante?.criteres_supplementaires
    ? `${existante.criteres_supplementaires}\n\n${noteRefus}`
    : noteRefus;

  const { error } = await supabase
    .from("demandes_recherche")
    .update({ statut: "refusee", criteres_supplementaires: criteresMaj })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/demandes-recherche");
  revalidatePath(`/admin/demandes-recherche/${id}`);
}

/** Corrections avant publication (ex. retirer une donnée identifiante glissée dans le texte libre). */
export async function corrigerDemandeRecherche(id: string, champs: {
  typeBien: string | null; ville: string; quartiers: string[]; budgetMin: number | null;
  budgetMax: number | null; surfaceMin: number | null; chambresMin: number | null;
  criteresSupplementaires: string | null; urgence: string | null; description: string | null;
}): Promise<void> {
  await exigerAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("demandes_recherche")
    .update({
      type_bien: champs.typeBien,
      ville: champs.ville,
      quartiers: champs.quartiers.length > 0 ? champs.quartiers : null,
      budget_min: champs.budgetMin,
      budget_max: champs.budgetMax,
      surface_min: champs.surfaceMin,
      chambres_min: champs.chambresMin,
      criteres_supplementaires: champs.criteresSupplementaires,
      urgence: champs.urgence,
      description: champs.description,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/demandes-recherche/${id}`);
}

export async function changerStatutProposition(propositionId: string, statut: StatutProposition): Promise<void> {
  await exigerAdmin();
  const supabase = await createClient();

  const { data: proposition, error } = await supabase
    .from("propositions_bien")
    .update({ statut })
    .eq("id", propositionId)
    .select("demande_id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/demandes-recherche/${proposition.demande_id}`);
}
