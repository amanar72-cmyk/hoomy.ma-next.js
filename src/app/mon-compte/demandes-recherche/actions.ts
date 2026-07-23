"use server";

// Actions du client authentifié sur SES demandes de recherche. La RLS
// (demandeur_id = auth.uid()) protège déjà l'accès aux lignes ; le trigger
// proteger_statut_demande_recherche() empêche déjà le changement de statut —
// ces actions ne tentent jamais de le faire, par cohérence.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { genererReferenceDemande } from "@/lib/demandes/reference";
import type { TransactionRecherche, ProfilPersonne } from "@/lib/demandes/types";

export type DonneesDemandeRecherche = {
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
  profilDemandeur: ProfilPersonne;
  transaction: TransactionRecherche;
  typeBien: string | null;
  ville: string;
  quartiers: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  surfaceMin: number | null;
  chambresMin: number | null;
  criteresSupplementaires: string | null;
  urgence: string | null;
  description: string | null;
};

function validerChamps(d: DonneesDemandeRecherche): string | null {
  if (!d.nom.trim()) return "Le nom est requis.";
  if (!d.telephone.trim()) return "Le téléphone est requis.";
  if (!d.ville.trim()) return "La ville est requise.";
  if (!["achat", "location"].includes(d.transaction)) return "Transaction invalide.";
  return null;
}

export async function creerDemandeRecherche(donnees: DonneesDemandeRecherche): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const erreur = validerChamps(donnees);
  if (erreur) throw new Error(erreur);

  const { data, error } = await supabase
    .from("demandes_recherche")
    .insert({
      demandeur_id: user.id,
      reference: genererReferenceDemande(),
      nom: donnees.nom.trim(),
      prenom: donnees.prenom?.trim() || null,
      telephone: donnees.telephone.trim(),
      email: donnees.email?.trim() || null,
      profil_demandeur: donnees.profilDemandeur,
      transaction: donnees.transaction,
      type_bien: donnees.typeBien,
      ville: donnees.ville.trim(),
      quartiers: donnees.quartiers.length > 0 ? donnees.quartiers : null,
      budget_min: donnees.budgetMin,
      budget_max: donnees.budgetMax,
      surface_min: donnees.surfaceMin,
      chambres_min: donnees.chambresMin,
      criteres_supplementaires: donnees.criteresSupplementaires?.trim() || null,
      urgence: donnees.urgence?.trim() || null,
      description: donnees.description?.trim() || null,
      // statut jamais fourni ici : DEFAULT 'en_validation' + trigger le
      // garantirait de toute façon même si on essayait.
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Création impossible.");

  revalidatePath("/mon-compte/demandes-recherche");
  return { id: data.id };
}

export async function modifierDemandeRecherche(id: string, donnees: DonneesDemandeRecherche): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const erreur = validerChamps(donnees);
  if (erreur) throw new Error(erreur);

  // Le demandeur ne peut modifier que tant que ce n'est pas encore publié
  // (règle produit) — vérifiée ici en plus de la RLS, pour un message clair.
  const { data: existante } = await supabase
    .from("demandes_recherche")
    .select("statut, demandeur_id")
    .eq("id", id)
    .maybeSingle();
  if (!existante || existante.demandeur_id !== user.id) throw new Error("Demande introuvable.");
  if (existante.statut === "publiee" || existante.statut === "pourvue") {
    throw new Error("Cette demande est déjà publiée — contactez un conseiller pour la modifier.");
  }

  const { error } = await supabase
    .from("demandes_recherche")
    .update({
      nom: donnees.nom.trim(),
      prenom: donnees.prenom?.trim() || null,
      telephone: donnees.telephone.trim(),
      email: donnees.email?.trim() || null,
      profil_demandeur: donnees.profilDemandeur,
      transaction: donnees.transaction,
      type_bien: donnees.typeBien,
      ville: donnees.ville.trim(),
      quartiers: donnees.quartiers.length > 0 ? donnees.quartiers : null,
      budget_min: donnees.budgetMin,
      budget_max: donnees.budgetMax,
      surface_min: donnees.surfaceMin,
      chambres_min: donnees.chambresMin,
      criteres_supplementaires: donnees.criteresSupplementaires?.trim() || null,
      urgence: donnees.urgence?.trim() || null,
      description: donnees.description?.trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/mon-compte/demandes-recherche");
  redirect("/mon-compte/demandes-recherche");
}

/**
 * "J'ai trouvé" : le client ne choisit JAMAIS son statut (trigger DB), donc
 * cette action ne touche PAS demandes_recherche — elle notifie l'admin par
 * email pour qu'il clôture manuellement après vérification.
 */
export async function demanderClotureDemande(id: string, reference: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: demande } = await supabase
    .from("demandes_recherche")
    .select("demandeur_id, nom, prenom")
    .eq("id", id)
    .maybeSingle();
  if (!demande || demande.demandeur_id !== user.id) throw new Error("Demande introuvable.");

  const nomComplet = [demande.prenom, demande.nom].filter(Boolean).join(" ");
  await envoyerEmail({
    sujet: `✅ Demande de clôture — ${reference}`,
    texte: [
      `${nomComplet} indique avoir trouvé un bien pour sa demande ${reference}.`,
      "",
      `Vérifiez et clôturez (statut "pourvue") depuis le back-office :`,
      `https://pro.hoomy.ma/admin/demandes-recherche/${id}`,
    ].join("\n"),
  });
}
