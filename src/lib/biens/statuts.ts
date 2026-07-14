// Cycle de vie d'un bien — libellés et couleurs des statuts, partagés entre
// les listes et fiches pro/admin. Les valeurs correspondent aux statuts
// réellement écrits en base (colonne texte, pas d'enum PostgreSQL).

export const STATUTS_BIEN: Record<string, { label: string; bg: string; color: string }> = {
  brouillon:              { label: "Brouillon",                bg: "#F4F6F5", color: "#6B7A71" },
  en_attente_affectation: { label: "En attente d'affectation", bg: "#FEF3C7", color: "#92400E" },
  dans_la_file:           { label: "Dans la file",             bg: "#FEF3C7", color: "#92400E" },
  affecte:                { label: "Affecté",                  bg: "#FEF3C7", color: "#92400E" },
  en_validation:          { label: "En validation BO",         bg: "#DBEAFE", color: "#1E40AF" },
  finalise:               { label: "Publié",                   bg: "#D1FAE5", color: "#065F46" },
  transacte:              { label: "Transacté",                bg: "#F3E8FF", color: "#6B21A8" },
  rejete:                 { label: "Rejeté",                   bg: "#FEE2E2", color: "#991B1B" },
  suspendu:               { label: "Suspendu",                 bg: "#F3F4F6", color: "#6B7280" },
  archive:                { label: "Archivé",                  bg: "#E5E7EB", color: "#374151" },
};

/** Ordre d'affichage des chips de filtre (suit le cycle de vie). */
export const ORDRE_STATUTS_BIEN = Object.keys(STATUTS_BIEN);

/** Libellé + couleurs d'un statut, avec repli pour un statut inconnu. */
export function infoStatut(statut: string | null | undefined) {
  return STATUTS_BIEN[statut ?? ""] ?? { label: statut ?? "—", bg: "#F4F6F5", color: "#6B7A71" };
}
