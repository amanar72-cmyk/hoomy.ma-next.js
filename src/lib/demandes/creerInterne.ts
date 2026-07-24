import "server-only";

// Création d'une demande de recherche PAR L'ÉQUIPE (admin ou agent), pour un
// client contacté hors-ligne (téléphone, en agence...) — liée à une fiche du
// répertoire contacts (contact_id) pour ne jamais perdre le fil de qui est le
// demandeur. cree_par trace l'auteur (admin ou agent) pour la notification
// email quand une proposition arrive (voir /api/demandes/proposer).
//
// Écrit en service_role : ni la table contacts ni demandes_recherche n'ont de
// policy RLS dédiée à cet usage interne — le rôle est vérifié en amont par
// l'appelant (exigerAdmin / garde agent), même schéma que le webhook WhatsApp
// et /api/demandes/proposer. Le trigger proteger_statut_demande_recherche()
// s'applique quand même : is_admin() est FAUX pour service_role, donc la
// ligne créée atterrit forcément en 'en_validation', jamais publiée
// directement — la modération admin reste un passage obligé, y compris pour
// une demande créée par l'admin lui-même.

import { createAdminClient } from "@/lib/supabase/admin";
import { genererReferenceDemande } from "./reference";
import type { TransactionRecherche } from "./types";

export type DonneesDemandeRechercheInterne = {
  contactId: string;
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

export async function creerDemandeRechercheInterne(
  donnees: DonneesDemandeRechercheInterne,
  creePar: string
): Promise<string> {
  const admin = createAdminClient();

  const { data: contact, error: eContact } = await admin
    .from("contacts")
    .select("nom, prenom, telephone, email")
    .eq("id", donnees.contactId)
    .maybeSingle();
  if (eContact || !contact) throw new Error("Contact introuvable dans le répertoire.");
  if (!contact.telephone) throw new Error("Ce contact n'a pas de téléphone renseigné.");
  if (!donnees.ville.trim()) throw new Error("La ville est requise.");

  const { data, error } = await admin
    .from("demandes_recherche")
    .insert({
      contact_id: donnees.contactId,
      cree_par: creePar,
      reference: genererReferenceDemande(),
      nom: contact.nom,
      prenom: contact.prenom,
      telephone: contact.telephone,
      email: contact.email,
      profil_demandeur: "particulier",
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
      // statut jamais fourni : DEFAULT 'en_validation' + trigger le garantit.
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Création impossible.");
  return data.id as string;
}
