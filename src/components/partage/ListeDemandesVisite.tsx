// Onglet « Demandes de visite » d'une fiche bien — liste en lecture, partagée
// entre les fiches pro et admin. Les données viennent de la table
// demandes_visite (RLS appliquée par l'appelant : agent → ses biens, admin → tout).

export type DemandeVisiteFiche = {
  id: string;
  nom_client: string | null;
  email_client: string | null;
  telephone_client: string | null;
  date_souhaitee: string | null;
  date_confirmee: string | null;
  message: string | null;
  statut: string | null;
  cree_le: string;
};

const BADGES: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "Nouvelle",  bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "Confirmée", bg: "#D1FAE5", color: "#065F46" },
  realisee:  { label: "Réalisée",  bg: "#CCFBF1", color: "#0F766E" },
  annulee:   { label: "Annulée",   bg: "#FEE2E2", color: "#991B1B" },
};

function formaterDateHeure(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ListeDemandesVisite({ demandes }: { demandes: DemandeVisiteFiche[] }) {
  if (demandes.length === 0) {
    return (
      <div
        className="rounded-2xl py-10 text-center text-sm"
        style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}
      >
        Aucune demande de visite pour ce bien
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {demandes.map((d) => {
        const badge = BADGES[d.statut ?? ""] ?? { label: d.statut ?? "—", bg: "#F4F6F5", color: "#6B7A71" };
        return (
          <article
            key={d.id}
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #F0EDE5" }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#1f2a24" }}>
                  {d.nom_client ?? "Client"}
                </p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>
                  Reçue le {formaterDateHeure(d.cree_le)}
                </p>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: "#6B7A71" }}>
              {d.telephone_client && (
                <a href={`tel:${d.telephone_client.replace(/\s/g, "")}`} style={{ color: "#0F4C3A", textDecoration: "none" }}>
                  📞 {d.telephone_client}
                </a>
              )}
              {d.email_client && (
                <a href={`mailto:${d.email_client}`} style={{ color: "#0F4C3A", textDecoration: "none" }}>
                  ✉️ {d.email_client}
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#6B7A71" }}>
              {d.date_souhaitee && <span>Souhaitée : {formaterDateHeure(d.date_souhaitee)}</span>}
              {d.date_confirmee && (
                <span className="font-semibold" style={{ color: "#065F46" }}>
                  Confirmée : {formaterDateHeure(d.date_confirmee)}
                </span>
              )}
            </div>

            {d.message && (
              <p
                className="text-sm mt-2 pt-2 leading-relaxed"
                style={{ color: "#3D4A42", borderTop: "1px solid #F8F5EE" }}
              >
                {d.message}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
