"use server";

// Répertoire pour la création d'une demande de recherche : recherche
// UNIFIÉE dans `contacts` (acheteurs/locataires) ET `proprietaires`
// (vendeurs) — une même personne peut vendre un bien ET en chercher un
// autre. `demandes_recherche.contact_id` référence toujours `contacts` :
// choisir un résultat venant de `proprietaires` déclenche une bascule
// silencieuse (upsert par téléphone, dédoublonné) vers `contacts`, jamais
// deux fiches pour la même personne. Réservé à l'équipe HOOMY
// (admin/agent/agence) ; écrit en service_role après vérification du rôle,
// même schéma que le répertoire propriétaires et le pipeline leads.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, upsertContactParTelephone } from "@/lib/leads/upsert";

export type SourceContact = "contact" | "proprietaire";

export type ContactOption = {
  id: string; // id dans SA table d'origine — voir `source`
  source: SourceContact;
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
};

export type ResultatContact = { ok: true; id: string } | { ok: false; erreur: string };

/** Session + rôle admin/agent/agence requis — même garde que le répertoire propriétaires. */
async function verifierAcces(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (!["admin", "agent", "agence"].includes(profil?.role ?? "")) {
    throw new Error("Réservé à l'équipe HOOMY.");
  }
}

/** Recherche live unifiée : contacts (acheteurs/locataires) + propriétaires (vendeurs). */
export async function rechercherContacts(requete: string): Promise<ContactOption[]> {
  await verifierAcces();
  const q = requete.trim();
  if (!q) return [];

  const admin = createAdminClient();
  const telephoneNormalise = normalizePhone(q);
  const filtre = telephoneNormalise
    ? `nom.ilike.%${q}%,prenom.ilike.%${q}%,telephone.eq.${telephoneNormalise}`
    : `nom.ilike.%${q}%,prenom.ilike.%${q}%`;

  const [{ data: contacts, error: eContacts }, { data: proprietaires, error: eProprietaires }] = await Promise.all([
    admin.from("contacts").select("id, nom, prenom, telephone, email").or(filtre).limit(5),
    admin.from("proprietaires").select("id, nom, prenom, telephone, email").or(filtre).limit(5),
  ]);
  if (eContacts) console.error("[contacts] recherche contacts échouée :", eContacts);
  if (eProprietaires) console.error("[contacts] recherche propriétaires échouée :", eProprietaires);

  const optionsContacts: ContactOption[] = (contacts ?? []).map((c) => ({ ...c, source: "contact" as const }));
  const optionsProprietaires: ContactOption[] = (proprietaires ?? []).map((p) => ({ ...p, source: "proprietaire" as const }));
  return [...optionsContacts, ...optionsProprietaires];
}

/** Crée (ou réutilise, dédoublonné par téléphone) une fiche contact. */
export async function creerContactRepertoire(donnees: {
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
}): Promise<ResultatContact> {
  await verifierAcces();

  const nom = donnees.nom.trim();
  const telephone = normalizePhone(donnees.telephone);
  if (!nom) return { ok: false, erreur: "Le nom est requis." };
  if (!telephone) return { ok: false, erreur: "Numéro de téléphone invalide." };

  const admin = createAdminClient();
  try {
    const id = await upsertContactParTelephone(
      admin,
      telephone,
      nom,
      donnees.prenom?.trim() || null,
      donnees.email?.trim() || null
    );
    return { ok: true, id };
  } catch (err) {
    return { ok: false, erreur: err instanceof Error ? err.message : "Création impossible." };
  }
}

/**
 * Bascule un résultat venant de `proprietaires` vers `contacts` (upsert par
 * téléphone) : demandes_recherche.contact_id référence toujours `contacts`,
 * jamais `proprietaires` directement.
 */
export async function resoudreContactDepuisProprietaire(proprietaireId: string): Promise<ResultatContact> {
  await verifierAcces();
  const admin = createAdminClient();

  const { data: proprietaire, error } = await admin
    .from("proprietaires")
    .select("nom, prenom, telephone, email")
    .eq("id", proprietaireId)
    .maybeSingle();
  if (error || !proprietaire) return { ok: false, erreur: "Propriétaire introuvable." };
  const telephone = normalizePhone(proprietaire.telephone);
  if (!telephone) return { ok: false, erreur: "Téléphone invalide sur cette fiche propriétaire." };

  try {
    const id = await upsertContactParTelephone(admin, telephone, proprietaire.nom, proprietaire.prenom, proprietaire.email);
    return { ok: true, id };
  } catch (err) {
    return { ok: false, erreur: err instanceof Error ? err.message : "Association impossible." };
  }
}
