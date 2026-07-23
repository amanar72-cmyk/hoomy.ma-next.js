// Types partagés pour les demandes de recherche (place de marché inversée).
// Table demandes_recherche — SÉPARÉE de demandes_visite (visites d'un bien
// déjà publié). Voir demandes_recherche.sql pour le schéma exact.

export type StatutDemandeRecherche =
  | "brouillon"
  | "en_validation"
  | "publiee"
  | "pourvue"
  | "refusee"
  | "archivee";

export type StatutProposition = "nouvelle" | "en_etude" | "retenue" | "refusee";

export type ProfilPersonne = "particulier" | "agence";

export type TransactionRecherche = "achat" | "location";

/** Champs anonymes exposés par la vue publique demandes_publiques. */
export type DemandePublique = {
  id: string;
  reference: string;
  transaction: TransactionRecherche;
  type_bien: string | null;
  ville: string;
  quartiers: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  surface_min: number | null;
  chambres_min: number | null;
  criteres_supplementaires: string | null;
  urgence: string | null;
  description: string | null;
  publiee_le: string | null;
};

/** Ligne complète (privée) — contact inclus, jamais envoyée à un visiteur public. */
export type DemandeRecherche = DemandePublique & {
  demandeur_id: string | null;
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
  profil_demandeur: ProfilPersonne;
  statut: StatutDemandeRecherche;
  cree_le: string;
  maj_le: string;
};

export type PropositionBien = {
  id: string;
  demande_id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  email: string | null;
  profil_proposeur: ProfilPersonne;
  nom_agence: string | null;
  type: string | null;
  ville: string | null;
  quartier: string | null;
  adresse_approx: string | null;
  prix: number | null;
  surface: number | null;
  chambres: number | null;
  salles_bain: number | null;
  etage: string | null;
  description: string | null;
  atouts: string | null;
  lien_annonce: string | null;
  photos: string[] | null;
  statut: StatutProposition;
  cree_le: string;
};

export const LIBELLES_STATUT_DEMANDE: Record<StatutDemandeRecherche, string> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  publiee: "Publiée",
  pourvue: "Pourvue",
  refusee: "Refusée",
  archivee: "Archivée",
};

export const LIBELLES_STATUT_PROPOSITION: Record<StatutProposition, string> = {
  nouvelle: "Nouvelle",
  en_etude: "En étude",
  retenue: "Retenue",
  refusee: "Refusée",
};

export const LIBELLE_TRANSACTION: Record<TransactionRecherche, string> = {
  achat: "Achat",
  location: "Location",
};

/** Formate la fourchette de budget pour affichage anonyme. */
export function formaterFourchetteBudget(min: number | null, max: number | null): string | null {
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/[   ]/g, " ");
  if (min && max) return `${fmt(min)} – ${fmt(max)} DH`;
  if (max) return `Jusqu'à ${fmt(max)} DH`;
  if (min) return `À partir de ${fmt(min)} DH`;
  return null;
}
