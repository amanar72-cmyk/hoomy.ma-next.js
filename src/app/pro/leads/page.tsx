import { MOCK_LEADS, type Lead } from "@/lib/pro/mockData";
import BadgeStatut from "@/components/pro/BadgeStatut";

const COLONNES: Lead["statut"][] = ["Nouveau", "Qualifié", "En cours", "RDV planifié", "Converti", "Perdu"];

const COULEURS_COL: Record<string, { border: string; header: string }> = {
  "Nouveau":       { border: "#BFDBFE", header: "#EFF6FF" },
  "Qualifié":      { border: "#DDD6FE", header: "#F5F3FF" },
  "En cours":      { border: "#FDE68A", header: "#FFFBEB" },
  "RDV planifié":  { border: "#99F6E4", header: "#F0FDFA" },
  "Converti":      { border: "#6EE7B7", header: "#ECFDF5" },
  "Perdu":         { border: "#FCA5A5", header: "#FEF2F2" },
};

export default function PageProLeads() {
  const parStatut = (statut: Lead["statut"]) =>
    MOCK_LEADS.filter((l) => l.statut === statut);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Leads
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {MOCK_LEADS.length} prospects — données de démonstration
          </p>
        </div>
        <button type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau lead
        </button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {COLONNES.map((statut) => {
          const leads = parStatut(statut);
          const col = COULEURS_COL[statut];
          return (
            <div key={statut} className="flex-shrink-0 flex flex-col rounded-2xl border"
              style={{ width: 280, borderColor: col.border, background: "#fff" }}>

              {/* En-tête colonne */}
              <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl border-b"
                style={{ background: col.header, borderColor: col.border }}>
                <div className="flex items-center gap-2">
                  <BadgeStatut statut={statut} small />
                </div>
                <span className="text-xs font-bold"
                  style={{ color: "#6B7A71" }}>
                  {leads.length}
                </span>
              </div>

              {/* Cartes leads */}
              <div className="flex flex-col gap-3 p-3 flex-1">
                {leads.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: "#C4D8CE" }}>
                    Aucun lead
                  </div>
                )}
                {leads.map((lead) => (
                  <div key={lead.id} className="rounded-xl p-3 border cursor-pointer hover:shadow-md transition-shadow"
                    style={{ background: "#FAFAF8", borderColor: "#F0EDE5" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#0F4C3A", color: "#D4AF37" }}>
                        {lead.nom.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <span className="text-xs" style={{ color: "#C4D8CE" }}>
                        {new Date(lead.date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#1f2a24" }}>{lead.nom}</p>
                    <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>{lead.type_bien} · {lead.ville}</p>
                    <p className="text-xs font-medium mb-2" style={{ color: "#0F4C3A" }}>{lead.budget}</p>
                    {lead.notes && (
                      <p className="text-xs line-clamp-2" style={{ color: "#6B7A71" }}>{lead.notes}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t"
                      style={{ borderColor: "#F0EDE5" }}>
                      <span className="text-xs" style={{ color: "#C4D8CE" }}>{lead.source}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#F4F6F5", color: "#6B7A71" }}>
                        {lead.telephone}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
