// Badge coloré selon le statut d'un bien ou d'une entité Pro

type Props = { statut: string; small?: boolean };

const COULEURS: Record<string, { bg: string; color: string }> = {
  "Publié":               { bg: "#D1FAE5", color: "#065F46" },
  "En traitement":        { bg: "#FEF3C7", color: "#92400E" },
  "Affectation en cours": { bg: "#DBEAFE", color: "#1E40AF" },
  "Finalisé":             { bg: "#CCFBF1", color: "#0F766E" },
  "Rejeté":               { bg: "#FEE2E2", color: "#991B1B" },
  "Suspendu":             { bg: "#F3F4F6", color: "#6B7280" },
  "Transacté":            { bg: "#D1FAE5", color: "#064E3B" },
  "Archivé":              { bg: "#E5E7EB", color: "#374151" },
  // Statuts leads
  "Nouveau":              { bg: "#DBEAFE", color: "#1E40AF" },
  "Qualifié":             { bg: "#EDE9FE", color: "#5B21B6" },
  "En cours":             { bg: "#FEF3C7", color: "#92400E" },
  "RDV planifié":         { bg: "#CCFBF1", color: "#0F766E" },
  "Converti":             { bg: "#D1FAE5", color: "#065F46" },
  "Perdu":                { bg: "#FEE2E2", color: "#991B1B" },
  // Statuts demandes
  "Nouvelle":             { bg: "#DBEAFE", color: "#1E40AF" },
  "Traitée":              { bg: "#D1FAE5", color: "#065F46" },
  "Annulée":              { bg: "#FEE2E2", color: "#991B1B" },
  // Statuts neuf
  "En commercialisation": { bg: "#D1FAE5", color: "#065F46" },
  "Bientôt disponible":   { bg: "#DBEAFE", color: "#1E40AF" },
  "Vendu":                { bg: "#E5E7EB", color: "#374151" },
};

export default function BadgeStatut({ statut, small = false }: Props) {
  const style = COULEURS[statut] ?? { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"}`}
      style={{ background: style.bg, color: style.color }}
    >
      {statut}
    </span>
  );
}
