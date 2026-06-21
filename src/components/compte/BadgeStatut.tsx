// Libellés orientés client (pas jargon interne)
export const STATUTS: Record<string, { label: string; couleur: string; texte: string }> = {
  brouillon:               { label: "Brouillon",                    couleur: "#F3F4F6", texte: "#6B7280" },
  en_attente_affectation:  { label: "En attente d'étude",           couleur: "#FEF3C7", texte: "#92400E" },
  dans_la_file:            { label: "En cours d'attribution",       couleur: "#DBEAFE", texte: "#1E40AF" },
  affecte:                 { label: "Pris en charge",               couleur: "#D1FAE5", texte: "#065F46" },
  finalise:                { label: "Publié",                       couleur: "#E8F5ED", texte: "#0F4C3A" },
  transacte:               { label: "Transaction finalisée",        couleur: "#FEF9C3", texte: "#713F12" },
  rejete:                  { label: "Refusé",                       couleur: "#FEE2E2", texte: "#991B1B" },
  suspendu:                { label: "Suspendu",                     couleur: "#F3F4F6", texte: "#6B7280" },
  archive:                 { label: "Archivé",                      couleur: "#F3F4F6", texte: "#9CA3AF" },
  // Libellés admin (conservés pour compatibilité)
  visite_planifiee:        { label: "Visite planifiée",             couleur: "#EDE9FE", texte: "#5B21B6" },
  offre_recue:             { label: "Offre reçue",                  couleur: "#FEE2E2", texte: "#991B1B" },
  compromis:               { label: "Compromis signé",              couleur: "#FCE7F3", texte: "#9D174D" },
  vendu:                   { label: "Vendu",                        couleur: "#E8F5ED", texte: "#0F4C3A" },
  loue:                    { label: "Loué",                         couleur: "#E8F5ED", texte: "#0F4C3A" },
  retire:                  { label: "Retiré",                       couleur: "#F3F4F6", texte: "#9CA3AF" },
};

export default function BadgeStatut({ statut }: { statut: string | null }) {
  const s = statut ?? "brouillon";
  const config = STATUTS[s] ?? { label: s, couleur: "#F3F4F6", texte: "#6B7280" };
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: config.couleur, color: config.texte }}
    >
      {config.label}
    </span>
  );
}
